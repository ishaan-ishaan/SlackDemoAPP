function doGet(e: any) {
  var params = (e && e.parameter) || {};

  if (params.mode === 'json') {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        message: 'JSON from GAS',
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (params.a !== undefined && params.b !== undefined) {
    var a = Number(params.a);
    var b = Number(params.b);
    var result = a + b;

    return ContentService.createTextOutput(
      JSON.stringify({ a: a, b: b, result: result })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    'Hello from Google Apps Script! Use ?mode=json or ?a=1&b=2'
  );
}

function myFunction() {
  Logger.log('myFunction executed at ' + new Date().toISOString());
  return 'ok';
}

function addNumbers(a: number, b: number): number {
  return a + b;
}

function getServerTime(): string {
  return new Date().toISOString();
}
