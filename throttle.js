module.exports = function(RED) {
    "use strict";

    function throttle(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        // config
        this.throttleType = config.throttleType || "time";
        this.timeLimitType = config.timeLimitType || "seconds";
        this.timeLimit = Number(config.timeLimit || 0);
        this.periodLimitType = config.periodLimitType || "seconds";
        this.periodLimit = Number(config.periodLimit || 0);
        this.countLimit = Number(config.countLimit || 0);
        this.blockSize = Number(config.blockSize || 0);
        this.locked = config.locked || false;
        this.resend = config.resend || false;

        function initialize(locked, node) {
            node.time = locked ? Math.floor(Date.now()) : 0;
            node.period = locked ? 0 : Math.floor(Date.now());
            node.count = locked ? 1 : 0;
            node.block = locked ? node.blockSize + 1 : 0;
            node.reset = !!locked;
        }
        
        // Initialize the current status, based on the 'locked' property
        initialize(this.locked, this);

        // calculate limit in milliseconds
        function getMilliSeconds(limitType, limit) {
            if( limitType === "hours" ) {
                return limit * 60 * 60 * 1000;
            }
            else if( limitType === "minutes" ) {
                return limit * 60 * 1000;
            }
            else if( limitType === "seconds" ) {
                 return limit * 1000;
            }
        }
        
        this.timeLimit = getMilliSeconds(this.timeLimitType, this.timeLimit);
        this.periodLimit = getMilliSeconds(this.periodLimitType, this.periodLimit);

        this.on("input", function(msg) {
            if( msg.reset) {
                initialize(false, node);
                
                if( node.resend !== true) {
                    // When a 'reset' message shouldn't be resended (on the output port), just skip it ...
                    return;
                }
            }
            
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
            
            // throttle by period
            else if( node.throttleType === "period" ) {
                if( isNaN(node.periodLimit) || !isFinite(node.periodLimit) ) {
                    return this.error("period limit is not numeric", msg);
                }

                var now = Math.floor(Date.now());

                if( node.period + node.periodLimit > now ) {
                    node.send(msg);
                }
            }

            // throttle by count
            else if( node.throttleType === "count" ) {
                if( isNaN(node.countLimit) || !isFinite(node.countLimit) ) {
                    return this.error("count limit is not numeric", msg);
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

                ++node.block;

                if( node.block <= node.blockSize ) {
                    node.send(msg);
                }
            }

            // throttle by reset
            else if( node.throttleType === "reset" ) {
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