"use strict";
var comb = require("comb"),
    amqp = require("amqp"),
    url = require("url"),
    logging = comb.logging,
    Appender = logging.appenders.Appender,
    string = comb.string,
    format = string.format,
    Level = logging.Level;

comb.define(Appender, {
    instance : {
        _amqpOptions : null,
        _queue : null,
        queueName : null,
        sendJson : true,
        inited : false,
        constructor : function (options) {
            options = options || {};
            var amqpOptions = this._amqpOptions = {}, sendJson = options.sendJson;
            this._queue = [];
            this.sendJson = comb.isBoolean(sendJson) ? sendJson : true;
            if (comb.isDefined(options.address)) {
                amqpOptions.url = options.address;
            } else {
                ["host", "port", "login", "password","vhost", "defaultExchangeName"].forEach(function (option) {
                    var opt = options[option];
                    if (opt) {
                        amqpOptions[option] = opt;
                    }
                });
            }
            !options.name && (options.name = "amqpAppender");
            var queueName = this.queueName = options.queueName;
            if(!queueName){
                throw new Error("queueName must be defined");
            }
            comb.listenForExit(this.__onExit.bind(this));
            this._super([options]);
        },

        __onExit : function () {
            if (this.connection) {
                this.connection.end();
            }
        },

        _setup : function () {
            if (!this.inited) {
                this.inited = true;
                var connection = amqp.createConnection(this._amqpOptions);
                connection.on('ready', function () {
                    this._queue.forEach(function (event) {
                        this._append(event, connection);
                    }.bind(this));
                    this._queue.length = 0;
                    this.connection = connection;
                }.bind(this));
            }
        },

        append:function (event) {
            if (this._canAppend(event)) {
                this._append(event);
            }
        },

        _append : function (event, connection) {
            connection = connection || this.connection;
            if (connection) {
                connection.publish(this.queueName, this.sendJson ? event : format(this.pattern, event));
            } else {
                this._queue.push(event);
                if (!this.inited) {
                    this._setup();
                }
            }
        }
    }
}).as(module);
