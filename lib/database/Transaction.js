
function Transaction(api, DB) {
  this._privateApi = api
  this._validStatus = true
  
  for(var funcName in api) {
    if(!/^(_|DB|begin)/.test(funcName)) {
      this._addFunc(funcName)
    }
  }

  this.DB = DB
}

Transaction.prototype._addFunc = function(funcName, args) {
  let tx = this
  this[funcName] = function() {
    let queryData = this._privateApi['_' + funcName].apply(this._privateApi, arguments)

    
    if(!this._validStatus) {
      return queryData.queryResultHandler(new Error('This transaction has now ended'), null)
    }
    
    tx._startOrResumeTransaction((err, client) => {
      if(err) {
        this._validStatus = false
        this._releaseClient(client)
        this._client = null
        queryData.queryResultHandler(err, null)
      } else {
        tx.DB.directQuery(client, queryData.queryString, queryData.queryArgs, (err, result) => {
          if(err) {
            this._validStatus = false
            this._releaseClient(client)
            this._client = null
          }
          queryData.queryResultHandler(err, result)
        })
      }
    })
  }
}

Transaction.prototype._startOrResumeTransaction = function(callback) {
  if(this._client) {
    callback(null, this._client)
  } else {
    this.DB.getPGClient((err, client, releaseClient) => {
      if(err) {
        callback(err, null)
      } else {
        this._client = client
        this._releaseClient = releaseClient
        client.query('BEGIN;', [], (err) => {
          if(err) {
            this._validStatus = false
            releaseClient(client)
            this._client = null
            callback(err, null)
          } else {
            this._status = 'inprogress'
            callback(null, client)
          }
        })
      }
    })
  }
}

Transaction.prototype.commit = function(callback) {
  if(this._client && this._validStatus) {
    this._client.query('COMMIT;', [], (err) => {
      this._releaseClient()
      this._client = null
      callback(err)
    })
  } else {
    callback(new Error('I am not in a state where I can commit anything. Either the TX was commited, rolled-back or no query was ever invoked.'))
  }
}

Transaction.prototype.rollback = function(callback) {
  if(this._client && this._validStatus) {
    this._client.query('ROLLBACK;', [], (err) => {
      this._releaseClient()
      this._client = null
      callback(err)
    })
  } else {
    callback(new Error('I am not in a state where I can rollback anything. Either the TX was commited, rolled-back or no query was ever invoked.'))
  }
}

module.exports = Transaction
