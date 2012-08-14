var comb = require("comb"),
    zmq = require("zmq"),
    url = require("url"),
    logging = comb.logging,
    Appender = logging.appenders.Appender,
    string = comb.string,
    format = string.format,
    Level = logging.Level;

//gather available zmq options
var zmqOptions = Object.keys(zmq.options).filter(function (key) {
    return !key.match(/^_/);
});
comb.define(Appender, {
    instance:{

        __url:null,

        __queue:null,

        inited:false,

        sendJson:true,

        envelope:"{levelName}",

        constructor:function (options) {
            options = options || {};
            !options.name && (options.name = "consoleAppender");
            this.sendJson = comb.isBoolean(options.sendJson) ? options.sendJson : true;
            var address = options.address;
            if (address) {
                this.__url = address;
            } else {
                var urlOptions = {};
                ["protocol", "host", "port"].forEach(function (opt) {
                    var urlOpt = options[opt];
                    if (comb.isDefined(urlOpt)) {
                        urlOptions[opt === "host" ? "hostname" : opt] = urlOpt;
                    } else {
                        throw new Error(opt + " is required if address is not defined");
                    }
                });
                this.__url = url.format(urlOptions);
            }
            var zmqOpts = (this._zmqOptions = {});
            zmqOptions.forEach(function (opt) {
                var zmqOpt = options[opt];
                if (!comb.isUndefinedOrNull(zmqOpt)) {
                    zmqOpts[opt] = zmqOpt;
                }
            });
            this.__queue = [];
            this._super(arguments, [options]);
            comb.listenForExit(this.__onExit.bind(this));
        },

        _setup:function () {
            if (!this.socket && !this.inited) {
                this.inited = true;
                var socket = zmq.socket("pub", this._zmqOptions);
                socket.bind(this.__url, function zmqAppenderBind(err) {
                    if (err) {
                        throw err;
                    } else {
                        console.log("bound");
                        this.__queue.forEach(function (event) {
                            this.__append(event, socket);
                        }.bind(this));
                        this.__queue.length = 0;
                        this.socket = socket;
                    }
                }.bind(this));
            }
        },

        __onExit:function () {
            if (this.socket) {
                this.socket.close();
                this.inited = false;
            }
        },


        append:function (event) {
            if (this._canAppend(event)) {
                this.__append(event);
            }
        },

        __append:function (event, socket) {
            socket = socket || this.socket;
            if (socket) {
                socket.send([format(this.envelope, event), this.sendJson ? JSON.stringify(event) : format(this.__pattern, event)]);
            } else {
                this.__queue.push(event);
                if (!this.inited) {
                    this._setup();
                }
            }
        }
    }
}).as(module);