const { json } = require('../protocol/v4')
const { RestInterceptor } = require('../api')

class WebConfiguration {
    /**
     * @param {RestInterceptor[]} interceptors
     */
    constructor(interceptors) {
        this.interceptors = interceptors
    }

    /**
     * @param {import('express').RequestHandler[]} converters
     */
    configureMessageConverters(converters) {
        converters.push((req, res, next) => {
            res.type('application/json')
            next()
        })
        converters.push((req, res, next) => {
            res.json(json)
            next()
        })
    }

    /**
     * @param {import('express').RequestHandler[]} registry
     */
    addInterceptors(registry) {
        this.interceptors.forEach(interceptor => registry.push(interceptor.getExpressHandler()))
    }
}

module.exports = { WebConfiguration }

