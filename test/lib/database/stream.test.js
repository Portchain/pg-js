
var path = require('path')
var assert = require('assert');;

describe('API database', function() {

  var db;
  var testEntryPrefix = 'stream_test_';
  var testId = Date.now();

  var queryDir = path.resolve(__dirname, 'queries');

  var config = {
    queryDirectory: queryDir,
    user: process.env.TEST_DB_USER || 'pgjs_test',
    password: process.env.TEST_DB_PWD,
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    database: process.env.TEST_DB_NAME || 'pgjs_test',
    port: process.env.TEST_DB_PORT || 5432,
    ssl: true
  };

  it('load the dependency', function() {
    db = require('../../../lib/database/')(config);
  });
  var arg1 = testEntryPrefix + testId;
  let testData = [
    [arg1, "1", "1"],
    [arg1, "2", "2"],
    [arg1, "3", "3"],
    [arg1, "4", "4"],
    [arg1, "5", "5"]
  ]

  it('populate test data', function(done) {
    
    
    db.multiInsert(testData, function(err) {
      if(err) return done(err)
      db.listEntriesByArg1(arg1, (err, entries) => {
        done()
      })
    });
  });

  it('stream', function(done) {
    var arg1 = testEntryPrefix + testId;
    let query = db.streamEntries(arg1);

    query.on('error', (err) => {
      assert.ok(!err, err ? err.stack : '');
    })

    let receivedRowsCount= 0
    let receivedRows = []
    query.on('row', (row) => {
      receivedRows[receivedRowsCount] = [row.arg1, row.arg2, row.arg3]
      receivedRowsCount ++
    })
    
    query.on('end', (result) => {
      assert.ok(result);
      assert.equal(result.rowCount, testData.length);
      assert.deepEqual(receivedRows, testData);
      done();
    });
  });

  it('stream with SQL error', function(done) {
    let query = db.streamError();

    query.on('error', (err) => {
      assert.ok(err);
      assert.ok(err.code, '42P01'); // UNDEFINED TABLE
      done();
    });

    query.on('row', (row) => {
      throw new Error('Unexpected "row" event. Expected an error event instead')
    });
    
    query.on('end', (result) => {
      throw new Error('Unexpected "end" event. Expected an error event instead')
    });
  });

  after(function(done) {
    var DB = require('../../../lib/database/ClientPool.js')(config);
    var qryStr = "DELETE FROM fubar WHERE arg1 LIKE '"+testEntryPrefix+"%'";
    DB.query(qryStr, [], function(err) {
      done(err);
    });
  });

});
