const request = require('supertest');
const app = require('../../app');

describe('POST /analyze', function () {
    test('Should return metadata if authenticated', (done) => {
        request(app)
            .post('/analyze')
            .attach('file', 'test_files/sample_SmartDoc.pdf')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                expect(res.body.result).toEqual(expect.any(Object))
                done();
            })
    });
    test('Should return false if authenticated', (done) => {
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
            })
    });
});

describe('POST /analyzeDocx', function () {
    test('Should return metadata if authenticated', (done) => {
        request(app)
            .post('/analyzeDocx')
            .attach('file', 'test_files/sample_SmartDoc.docx')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                expect(res.body.result).toEqual(expect.any(Object))
                done();
            })
    });
    test('Should return false if authenticated', (done) => {
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
            })
    });
});

describe('POST /pdf', function () {
    const meta_form = '{"text":"test"}';
    const data_form = '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
    test('Should return signed pdf-format smart document', (done) => {
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
                expect(res.header['id']).toEqual(expect.any(String));
                expect(res.body).toEqual(expect.any(Buffer));
                done();
            })
    });
});

describe('POST /doc', function () {
    const meta_form = '{"text":"test"}';
    const data_form = '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
    test('Should return signed pdf-format smart document', (done) => {
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
                expect(res.header['id']).toEqual(expect.any(String));
                expect(res.body).toEqual(expect.any(Buffer));
                done();
            })
    });
});

describe('POST /docxSmartdoc', function () {
    const meta_form = '{"text":"test"}';
    const data_form = '[{"name":"Text Field","type":1,"icon":"text_field.png","id":"585383c0-573a-11eb-903c-35b6d9827ce0","label":"Text","cid":"text"}]';
    test('Should return signed docx-format smart document', (done) => {
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
                expect(res.header['id']).toEqual(expect.any(String));
                done();
            })
    });
});

describe('GET /QRVerify/:guid', () => {
    test('Should return success ejs if authenticated', (done) => {
        request(app)
            .get('/QRVerify/af702180-58ad-11eb-8d19-4111daa82f84')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                expect(res.text).toEqual(expect.not.stringContaining('Not authenticated by Integra!'));
                done();
            })
    });

    test('Should return failure ejs if not authenticated', (done) => {
        request(app)
            .get('/QRVerify/aaaaaaaa-test-test-test-aaaaaaaaaaaa')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                expect(res.text).toEqual(expect.stringContaining('Not authenticated by Integra!'));
                done();
            })
    });
});

describe('GET /', () => {
    test('Should return blockchain api url', async () => {
        await request(app)
            .get('/')
            .expect(200);
    });
});
