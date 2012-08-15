/*
 *
 * Publisher subscriber pattern
 *
 */
"use strict";

var cluster = require('cluster'),
    amqp = require('amqp'),
    address = 'amqp://guest:guest@127.0.0.1:5672',
    queueName = 'my-queue',
    AmqpAppender = require("../../index.js").AmqpAppender,
    comb = require("comb");

function listen (connection) {
    return {
        toQueue : function listenToQueue (queueName) {
            connection.queue(queueName, function (q) {
                console.log('listenToQueue: ' + queueName);
                // bind to all
                q.bind('#');

                q.subscribe(function (message) {
                    console.log(queueName + ' - ' + JSON.stringify(message));
                });
            });
            return this;
        }
    };
}

if (cluster.isMaster) {
    for (var i = 0; i < 2; i++) { cluster.fork(); }

    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    var logger = comb.logging.Logger.getLogger(queueName);
    logger.addAppender(new AmqpAppender({queueName : queueName + '-warn', level : 'warn', address : address}));
    logger.addAppender(new AmqpAppender({queueName : queueName + '-debug', name : 'debug', level : 'debug', address : address}));
    // logger.addAppender(new comb.logging.appenders.ConsoleAppender());
    var levels = ["debug", "trace", "info", "warn", "error", "fatal"], count = 0;
    setInterval(function () {
        var level = levels[count++ % levels.length];
        logger[level]("logging a " + level.toUpperCase() + " message");
    }, 500);
    logger.info("starting");


} else {
    //subscriber = receive only
    //
    var connection = amqp.createConnection();

    connection.on('ready', function () {
        listen(connection)
            .toQueue(queueName + '-debug')
            .toQueue(queueName + '-warn');
    });
}

