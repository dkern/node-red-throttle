module.exports = function(RED) {
    "use strict";

    function throttle(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        // config
        this.throttleType = config.throttleType || "time";
        this.timeLimitType = config.timeLimitType || "seconds";
        this.timeLimit = Number(config.timeLimit || 0);
        this.countLimit = Number(config.countLimit || 0);
        this.blockSize = Number(config.blockSize || 0);
        this.locked = config.locked || false;

        // helpers
        this.time = this.locked ? Math.floor(Date.now()) : 0;
        this.count = this.locked ? 1 : 0;
        this.block = this.locked ? this.blockSize + 1 : 0;
        this.reset = !!this.locked;

        // calculate time limit in milliseconds
        if( this.timeLimitType === "hours" ) {
            this.timeLimit *= 60 * 60 * 1000;
        }
        else if( this.timeLimitType === "minutes" ) {
            this.timeLimit *= 60 * 1000;
        }
        else if( this.timeLimitType === "seconds" ) {
            this.timeLimit *= 1000;
        }

        this.on("input", function(msg) {
            // throttle by time
            if( node.throttleType === "time" ) {
                if( isNaN(node.timeLimit) || !isFinite(node.timeLimit) ) {
                    return this.error("time limit is not numeric", msg);
                }

                var now = Math.floor(Date.now());

                if( node.time + node.timeLimit < now ) {
                    node.time = now;
                    node.send(msg);
                }
            }

            // throttle by count
            else if( node.throttleType === "count" ) {
                if( isNaN(node.countLimit) || !isFinite(node.countLimit) ) {
                    return this.error("count limit is not numeric", msg);
                }

                if (msg.reset) {
                    node.count = 0;
                    return;
                }

                ++node.count;

                if( node.count >= node.countLimit ) {
                    node.count = 0;
                }

                if( node.countLimit === 0 || node.countLimit === 1 || node.count === 1 ) {
                    node.send(msg);
                }
            }

            // throttle by block size
            else if( node.throttleType === "block" ) {
                if( isNaN(node.blockSize) || !isFinite(node.blockSize) ) {
                    return this.error("block size is not numeric", msg);
                }

                if (msg.reset) {
                    node.block = 0;
                    return;
                }

                ++node.block;

                if( node.block <= node.blockSize ) {
                    node.send(msg);
                }
            }

            // throttle by reset
            else if (node.throttleType === "reset") {
                if (msg.reset) {
                    node.reset = false;
                    return;
                }
                if( !node.reset ) {
                    node.reset = true;
                    node.send(msg);
                }
            }

            // unknown throttle type
            else {
                this.error("unknown throttle type '" + node.throttleType + "'", msg);
            }
        });
    }

    RED.nodes.registerType("throttle", throttle);
};