
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
