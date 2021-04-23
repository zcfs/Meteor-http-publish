Package.describe({
  git: 'https://github.com/zcfs/Meteor-http-publish.git',
  name: 'zcfs:http-publish',
  version: '0.0.13',
  summary: 'Adds HTTP.publish and HTTP.unpublish RESTful'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use(['webapp', 'underscore', 'ejson', 'random'], 'server');

  api.use('zcfs:http-methods@0.0.27');

  api.imply && api.imply('zcfs:http-methods');

  api.export && api.export('_publishHTTP', { testOnly: true });

  api.addFiles('http.publish.client.api.js', 'client');
  api.addFiles('http.publish.server.api.js', 'server');

});

Package.onTest(function (api) {
  api.use('zcfs:http-publish', ['client', 'server']);
  api.use('test-helpers', ['client', 'server']);
  api.use('http', 'client');

  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.addFiles('http.publish.tests.server.js', 'server');
  api.addFiles('http.publish.tests.client.js', 'client');
});
