
var path = require('path')
var assert = require('assert');;

describe('API database', function() {

  var db;
  var testEntryPrefix = 'unit_test_';
  var testId = Date.now();

  var queryDir = path.resolve(__dirname, 'queries');

  var config = {
    queryDirectory: queryDir,
    user: process.env.TEST_DB_USER || 'pg_js_test',
    password: process.env.TEST_DB_PWD,
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    database: process.env.TEST_DB_NAME || 'pg_js_test',
    port: process.env.TEST_DB_PORT || 5432,
    ssl: true
  };

  it('load the dependency', function() {
    db = require('../../../lib/database/')(config);
  });

  it('ensure SSL is used', function(done) {
    db.sslIsUsed(function(err, result) {
      assert.ok(!err, err ? err.stack : '');
      assert.ok(result)
      done();
    });
  });

  it('populate test data', function(done) {
    
    var arg1 = testEntryPrefix + testId;
    db.createFubar(arg1, "2", "3", function(err) {
      done(err);
    });
  });

  it('fetch', function(done) {
    var arg1 = testEntryPrefix + testId;
    db.testFunc(arg1, "2", "3", function(err, account) {
      assert.ok(!err, err ? err.stack : '');
      assert.ok(account);
      assert.equal(account.arg1, arg1);
      done();
    });
  });

  it('SQL query file', function(done) {
    
    var arg1 = testEntryPrefix + testId + '_sql';
    db.createAccount(arg1, "2", "3", function(err) {
      done(err);
    });
  });

  it('fetch result from SQL file', function(done) {
    var arg1 = testEntryPrefix + testId + '_sql';
    db.testFunc(arg1, "2", "3", function(err, account) {
      assert.ok(!err, err ? err.stack : '');
      assert.ok(account);
      assert.equal(account.arg1, arg1);
      done();
    });
  });

  it('insert multiple rows at once', function(done) {
    
    var arg1 = testEntryPrefix + testId + '_multi_insert';
    let data = [
      [arg1, "1", "1"],
      [arg1, "2", "2"],
      [arg1, "3", "3"]
    ]
    
    db.multiInsert(data, function(err) {
      if(err) return done(err)
      db.listEntriesByArg1(arg1, (err, entries) => {
        done()
      })
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
