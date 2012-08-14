/*
 *
 * Publisher subscriber pattern
 *
 */

var cluster = require('cluster'),
    zmq = require('zmq'),
    address = 'tcp://127.0.0.1:12345',
    ZeroMqAppender = require("../../index.js").ZeroMqAppender;
comb = require("comb");

if (cluster.isMaster) {
    for (var i = 0; i < 2; i++) cluster.fork();

    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    var logger = comb.logging.Logger.getLogger("zmq-test");
    logger.addAppender(new ZeroMqAppender({address:address}));
    var levels = ["debug", "trace", "info", "warn", "error", "fatal"], count = 0;
    setInterval(function () {
        var level = levels[count++ % levels.length];
        logger[level]("logging a " + level.toUpperCase() + " message");
    }, 500);
    logger.info("starting");


} else {
    //subscriber = receive only
    var socket = zmq.socket('sub');

    socket.identity = 'subscriber' + process.pid;

    socket.connect(address);
    //socket.subscribe("INFO");
    socket.subscribe("INFO");
    socket.subscribe("DEBUG");
    socket.on('message', function (envelope, data) {
        console.log(socket.identity + ': received \n\tenvelope: %s \n\tdata : %s', envelope.toString(), data.toString());
    });

}