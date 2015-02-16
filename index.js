var _ = require('lodash');
var async = require('async');
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var temp = require('temp');
var util = require('util');

module.exports = function (options, callback) {
  var tempfile = null;

  if (typeof options === 'string') {
    options = {file: options};
  }

  _.defaults(options, {
    clipSize: 15,
    sampleRate: 16000
  });

  if (Buffer.isBuffer(options.file)) {
    var buf = options.file;
    var suffix = '.' + options.filetype;
    tempfile = temp.openSync({suffix: suffix});
    fs.writeSync(tempfile.fd, buf, 0, buf.length);
    options.file = tempfile.path;
  }

  ffmpeg.ffprobe(options.file, function (err, info) {
    if (err) callback(err);
    var size = info.format.duration;
    var clipCount = Math.ceil(size / options.clipSize);
    var clips = _.range(clipCount);

    function each(clip, callback) {
      var output = temp.path({suffix: '-' + clip + '.flac'});

      ffmpeg()
        .on('error', callback)
        .on('end', function () {
          callback(null, output);
        })
        .input(options.file)
        .setStartTime(clip * options.clipSize)
        .duration(options.clipSize)
        .output(output)
        .audioFrequency(options.sampleRate)
        .toFormat('flac')
        .run();
    }

    function done(err, files) {
      if (tempfile) fs.unlink(tempfile);
      callback(err, files);
    }

    async.map(clips, each, done);
  });
};
