const request = require('supertest');
const app = require('../../app');

describe('POST /analyze', () => {
  const filename = process.env.APP_ENV === 'development' ? 'sample_SmartDoc.pdf' : 'sample_prod_SmartDoc.pdf';
  test('Should return metadata if authenticated', done => {
    request(app)
      .post('/analyze')
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
  const guid = process.env.APP_ENV === 'development' ? 'af702180-58ad-11eb-8d19-4111daa82f84' : '9ef367e0-5b2d-11eb-8a77-790a5e8c3d4f';

  test('Should return success ejs if authenticated', done => {
    request(app)
      .get(`/QRVerify/${guid}`)
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
