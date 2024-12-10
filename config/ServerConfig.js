/**
 * Copyright (c) 2021 Freya Arbjerg and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class ServerConfig {
    constructor() {
        this.password = null;
        this.isNonAllocatingFrameBuffer = false;
        this.bufferDurationMs = null;
        this.frameBufferDurationMs = null;
        this.opusEncodingQuality = null;
        this.resamplingQuality = null; // This would need a corresponding equivalent in Node.js
        this.trackStuckThresholdMs = null;
        this.useSeekGhosting = null;
        this.youtubePlaylistLoadLimit = null;
        this.playerUpdateInterval = 5;
        this.isGcWarnings = true;
        this.isYoutubeSearchEnabled = true;
        this.isSoundcloudSearchEnabled = true;
        this.ratelimit = null;
        this.youtubeConfig = null;
        this.httpConfig = null;
        this.filters = {};
    }
}

module.exports = ServerConfig;

