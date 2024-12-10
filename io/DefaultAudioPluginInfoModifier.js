
class DefaultAudioPluginInfoModifier {
    static probeInfo(descriptor) {
        return descriptor.probe.name + (descriptor.parameters ? `|${descriptor.parameters}` : '');
    }

    modifyAudioTrackPluginInfo(track) {
        const { key, value } = (() => {
            switch (true) {
                case track instanceof require('lavaplayer').source.local.LocalAudioTrack:
                    return { key: 'probeInfo', value: track.containerTrackFactory.probeInfo() };
                case track instanceof require('lavaplayer').source.http.HttpAudioTrack:
                    return { key: 'probeInfo', value: track.containerTrackFactory.probeInfo() };
                default:
                    return null;
            }
        })();

        return key && value ? { [key]: value } : null;
    }
}

module.exports = DefaultAudioPluginInfoModifier;

