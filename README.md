
2016 (c) Nearform Ltd.

# pg-js

## installation

```
npm install -S -E pg-js
```

## Example

Put your SQL queries in JSON files in a given directory. This directory will be
recursively parsed by pg-js.

The suffix ``.query.json`` is necessary for the queries to be read by pg-js.

Query config:

```
// ./queries/myFunc.query.json
{
  "id": "myfunc",
  "query": [
    "SELECT arg1, arg2, arg3",
    "FROM fubar",
    "WHERE arg1 = $1 AND arg2 = $2 AND arg3 = $3 LIMIT 1"
  ],
  "args": [{
    "type": "string"
  }, {
    "type": "string"
  }, {
    "type": "string"
  }],
  "returns": {
    "uniqueResult": true
  }
}
```


```
// ./test.js
var pgJs = require('pg-js')({
  pgConnString: 'postgres://username:password@localhost/database',
  queryDirectory: path.resolve(__dirname, 'queries')
});

pgJs.myFunc(arg1, arg2, arg3, function(err, row) {
  // because the JSON definition file specifies "uniqueResult":true, the resilt
  // row will either be the found object or of type 'undefined'.
});

```


## Transactions

You can wrap your function/queries inside a transaction block (``BEGiN``/
``COMMIT``).

The functions will be called sequentially, in the order they are invoked.
The callback for each function becomes optional.
The final ``commit(...)`` callback is optional as well. It will be called no matter
what.


```
var tx = pgJs.begin();

tx.myFunc1(..., function(err, result) {

});

tx.myFunc2(...);

tx.myFunc3(..., function(err, result) {

});

tx.commit(function(err, results) {
  // err: if any error happened / tx aborted
  // results: an array of all the results, in order.
});
```

> tx blocks will take and hold a client from the connection pool until the
> client is released via commit. It is possible to manually rollback a tx block
> through the ``rollback()`` function. It works like ``commit()`` but the only
> possible argument is an error.