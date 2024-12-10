const express = require('express');

const router = express.Router();

class RoutePlannerRestHandler {
    constructor(routePlanner) {
        this.routePlanner = routePlanner;
    }

    /**
     * Returns current information about the active AbstractRoutePlanner
     */
    getStatus(req, res) {
        if (!this.routePlanner) {
            return res.status(204).send();
        }
        const status = this.getDetailBlock(this.routePlanner);
        return res.status(200).json(status);
    }

    /**
     * Removes a single address from the addresses which are currently marked as failing
     */
    freeSingleAddress(req, res) {
        if (!this.routePlanner) throw new RoutePlannerDisabledException();
        try {
            const address = req.body.address;
            this.routePlanner.freeAddress(address);
            return res.status(204).send();
        } catch (exception) {
            throw new ResponseStatusException(400, `Invalid address: ${exception.message}`, exception);
        }
    }

    /**
     * Removes all addresses from the list which holds the addresses which are marked failing
     */
    freeAllAddresses(req, res) {
        if (!this.routePlanner) throw new RoutePlannerDisabledException();
        this.routePlanner.freeAllAddresses();
        return res.status(204).send();
    }

    /**
     * Detail information block for an AbstractRoutePlanner
     */
    getDetailBlock(planner) {
        const ipBlock = planner.ipBlock;
        const ipBlockStatus = {
            type: ipBlock.type.simpleName,
            size: ipBlock.size.toString()
        };

        const failingAddresses = planner.failingAddresses;
        const failingAddressesStatus = Array.from(failingAddresses.entries()).map(([key, value]) => {
            return {
                address: key,
                lastFailure: new Date(value).toString()
            };
        });

        switch (planner.constructor) {
            case RotatingIpRoutePlanner:
                return {
                    type: "RotatingIpRoutePlanner",
                    details: {
                        ipBlock: ipBlockStatus,
                        failingAddresses: failingAddressesStatus,
                        rotateIndex: planner.rotateIndex.toString(),
                        index: planner.index.toString(),
                        currentAddress: planner.currentAddress.toString()
                    }
                };
            case NanoIpRoutePlanner:
                return {
                    type: "NanoIpRoutePlanner",
                    details: {
                        ipBlock: ipBlockStatus,
                        failingAddresses: failingAddressesStatus,
                        currentAddress: planner.currentAddress.toString()
                    }
                };
            case RotatingNanoIpRoutePlanner:
                return {
                    type: "RotatingNanoIpRoutePlanner",
                    details: {
                        ipBlock: ipBlockStatus,
                        failingAddresses: failingAddressesStatus,
                        currentBlock: planner.currentBlock.toString(),
                        addressIndexInBlock: planner.addressIndexInBlock.toString()
                    }
                };
            case BalancingIpRoutePlanner:
                return {
                    type: "BalancingIpRoutePlanner",
                    details: {
                        ipBlock: ipBlockStatus,
                        failingAddresses: failingAddressesStatus
                    }
                };
            default:
                throw new Error(`Received unexpected route planner type: ${planner.constructor.name}`);
        }
    }
}

class RoutePlannerDisabledException extends Error {
    constructor() {
        super("Can't access disabled route planner");
        this.statusCode = 500;
    }
}

const routePlannerRestHandler = new RoutePlannerRestHandler(null);

router.get('/v4/routeplanner/status', (req, res) => routePlannerRestHandler.getStatus(req, res));
router.post('/v4/routeplanner/free/address', (req, res) => routePlannerRestHandler.freeSingleAddress(req, res));
router.post('/v4/routeplanner/free/all', (req, res) => routePlannerRestHandler.freeAllAddresses(req, res));

module.exports = router;

