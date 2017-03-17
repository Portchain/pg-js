
var path = require('path')
var assert = require('assert');;

describe('transaction', function() {

  var db;
  var testEntryPrefix = 'unit_test_tx_';
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

  
  describe('manual rollback', () => {
    var tx;
    it('Initiate a transaction', function() {
      tx = db.begin()
    });

    it('populate test data', function(done) {

      
      var arg1 = testEntryPrefix + testId;
      tx.createFubar(arg1, "2", "3", function(err) {
        done(err);
      });
    });

    it('fetch', function(done) {
      var arg1 = testEntryPrefix + testId;
      tx.testFunc(arg1, "2", "3", function(err, accounts) {
        assert.ok(!err, err ? err.stack : '');
        assert.ok(accounts);
        assert.ok(accounts[0]);
        assert.equal(accounts[0].arg1, arg1);
        done();
      });
    });

    it('rollback TX, make sure no entries were saved', function(done) {
      
      var arg1 = testEntryPrefix + testId;
      tx.rollback(function(err) {
        assert.ok(!err, err ? err.stack : '')
        db.testFunc(arg1, "2", "3", function(err, accounts) {
          assert.ok(!err, err ? err.stack : '');
          assert.ok(accounts);
          assert.equal(accounts.length, 0);
          done();
        });
      });
    });
  })
  
  describe('auto rollback', () => {
    var tx;
    it('Initiate a transaction', function() {
      tx = db.begin()
    });

    let arg1 = testEntryPrefix + testId + '_rlbck'
    it('successful query', function(done) {      
      tx.createFubar(arg1, "3", "3", function(err) {
        done(err);
      });
    });

    it('failed query', function(done) {
      tx.failingQuery(function(err) {
        assert.ok(err);
        done();
      });
    });
    
    it('attempting to query should fail as TX was rolled-back', function(done) {      
      tx.createFubar(arg1, "3", "4", function(err) {
        assert.ok(err)
        assert.equal(err.code, '25P02') // in_failed_sql_transaction
        done();
      });
    });

    it('make sure no entries were saved', function(done) {
      db.listEntriesByArg1(arg1, function(err, entries) {
        assert.ok(!err, err ? err.stack : '');
        assert.ok(entries);
        assert.equal(entries.length, 0);
        done();
      });
    });
  })
  
  describe('commit', () => {
    var tx;
    it('Initiate a transaction', function() {
      tx = db.begin()
    });

    it('populate test data', function(done) {

      
      var arg1 = testEntryPrefix + testId;
      tx.createFubar(arg1, "1", "1", function(err) {
        done(err);
      });
    });

    it('fetch', function(done) {
      var arg1 = testEntryPrefix + testId;
      tx.testFunc(arg1, "1", "1", function(err, accounts) {
        assert.ok(!err, err ? err.stack : '');
        assert.ok(accounts);
        assert.ok(accounts[0]);
        assert.equal(accounts[0].arg1, arg1);
        done();
      });
    });

    it('commit TX, make sure entries were saved', function(done) {
      
      var arg1 = testEntryPrefix + testId;
      tx.commit(function(err) {
        assert.ok(!err, err ? err.stack : '')
        db.testFunc(arg1, "1", "1", function(err, accounts) {
          assert.ok(!err, err ? err.stack : '');
          assert.ok(accounts);
          assert.ok(accounts[0]);
          assert.equal(accounts[0].arg1, arg1);
          done();
        });
      });
    });
  })


  after(function(done) {
    var DB = require('../../../lib/database/ClientPool.js')(config);
    var qryStr = "DELETE FROM fubar WHERE arg1 LIKE '"+testEntryPrefix+"%'";
    
    DB.query(qryStr, [], function(err) {
      done(err);
    });
  });

});
