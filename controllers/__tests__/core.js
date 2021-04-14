const request = require('supertest');
const app = require('../../app');

describe('POST /analyze', () => {
  const filename = process.env.APP_ENV === 'development' ? 'sample_SmartDoc.pdf' : 'sample_prod_SmartDoc.pdf';
  test('Should return metadata if authenticated', done => {
    request(app)
      .post('/analyze')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .attach('file', `test_files/${filename}`)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.result).toEqual(expect.any(Object));
        done();
      });
  });
  test('Should return false if not authenticated', done => {
    request(app)
      .post('/analyze')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .attach('file', 'test_files/sample.pdf')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.result).toBeFalsy();
        done();
      });
  });
});

describe('POST /analyzeDocx', () => {
  const filename = process.env.APP_ENV === 'development' ? 'sample_SmartDoc.docx' : 'sample_prod_SmartDoc.docx';
  test('Should return metadata if authenticated', done => {
    request(app)
      .post('/analyzeDocx')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .attach('file', `test_files/${filename}`)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.result).toEqual(expect.any(Object));
        done();
      });
  });
  test('Should return false if not authenticated', done => {
    request(app)
      .post('/analyzeDocx')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .attach('file', 'test_files/sample.docx')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.result).toBeFalsy();
        done();
      });
  });
});

describe('POST /pdf', () => {
  const meta_form = '{"text":"test"}';
  const data_form =
    '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
  test('Should return signed pdf-format smart document', done => {
    request(app)
      .post('/pdf')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .field('meta_form', meta_form)
      .field('data_form', data_form)
      .attach('file', 'test_files/sample.pdf')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.header['file-name']).toEqual(expect.any(String));
        expect(res.header.id).toEqual(expect.any(String));
        expect(res.body).toEqual(expect.any(Buffer));
        done();
      });
  });
});

describe('POST /doc', () => {
  const meta_form = '{"text":"test"}';
  const data_form =
    '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
  test('Should return signed pdf-format smart document', done => {
    request(app)
      .post('/doc')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .field('meta_form', meta_form)
      .field('data_form', data_form)
      .attach('file', 'test_files/sample.docx')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.header['file-name']).toEqual(expect.any(String));
        expect(res.header.id).toEqual(expect.any(String));
        expect(res.body).toEqual(expect.any(Buffer));
        done();
      });
  });
});

describe('POST /docxSmartdoc', () => {
  const meta_form = '{"text":"test"}';
  const data_form =
    '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
  test('Should return signed docx-format smart document', done => {
    request(app)
      .post('/docxSmartdoc')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .field('meta_form', meta_form)
      .field('data_form', data_form)
      .attach('file', 'test_files/sample.docx')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.header['file-name']).toEqual(expect.any(String));
        expect(res.header.id).toEqual(expect.any(String));
        done();
      });
  });
});

describe('POST /docxSmartDocAutoOpen', () => {
  const meta_form = '{"text":"test"}';
  const data_form =
    '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
  test('Should return signed docx-format smart document', done => {
    request(app)
      .post('/docxSmartDocAutoOpen')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .field('meta_form', meta_form)
      .field('data_form', data_form)
      .attach('file', 'test_files/sample.docx')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.header['file-name']).toEqual(expect.any(String));
        expect(res.header.id).toEqual(expect.any(String));
        done();
      });
  });
});

describe('GET /QRVerify/:guid', () => {
  const guid = process.env.APP_ENV === 'development' ? '264d08d0-9cf7-11eb-bed6-97fda5311a11' : '7cbe5b70-9cf6-11eb-ad94-73a0e2128331';

  test('Should return success ejs if authenticated', done => {
    request(app)
      .get(`/QRVerify/${guid}`)
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.text).toEqual(expect.not.stringContaining('Not authenticated by Integra!'));
        done();
      });
  });

  test('Should return failure ejs if not authenticated', done => {
    request(app)
      .get('/QRVerify/aaaaaaaa-test-test-test-aaaaaaaaaaaa')
      .set('x-subscription-key', process.env.SUBSCRIPTION_KEY)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.text).toEqual(expect.stringContaining('Not authenticated by Integra!'));
        done();
      });
  });
});

describe('GET /', () => {
  test('Should return blockchain api url', async () => {
    await request(app).get('/').expect(200);
  });
});
