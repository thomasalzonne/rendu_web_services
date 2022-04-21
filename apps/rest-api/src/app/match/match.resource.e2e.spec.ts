import { MatchModule } from './match.module';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MatchDocument, MatchEntity } from './match.entity';
import {MatchService} from "./match.service";
import {plainToClass} from "class-transformer";
import {MatchCreateValidationDto} from "./match.validation";
import {validate} from "class-validator";

describe('Matchs', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let entityId;
  let model: Model<MatchDocument>;
  let service: MatchService;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), MatchModule],
    }).compile();

    model = moduleRef.get<Model<MatchDocument>>(
      getModelToken(MatchEntity.name)
    );


    const entities = [
      { date: ('2022-03-08T20:00:00.000Z'), homeTeamName: 'TOTO0', awayTeamName: 'Inter Milan', homeTeamScore: 0, awayTeamScore: 1 },
      { date: ('2022-03-08T20:00:00.000Z'), homeTeamName: 'TOTO1', awayTeamName: 'Inter Milan', homeTeamScore: 0, awayTeamScore: 1 },
      { date: ('2022-03-08T20:00:00.000Z'), homeTeamName: 'TOTO2', awayTeamName: 'Inter Milan', homeTeamScore: 0, awayTeamScore: 1 },
      { date: ('2022-03-08T20:00:00.000Z'), homeTeamName: 'TOTO3', awayTeamName: 'Inter Milan', homeTeamScore: 0, awayTeamScore: 1 },
    ];
    for (const entity of entities) {
      const document = await model.create(entity);
      entityId = document.id;
    }
    jest.setTimeout(60000);
    app = moduleRef.createNestApplication();
    await app.init();
    service = moduleRef.get<MatchService>(MatchService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /matchs', () => {
    it('POST should post data', (done) => {
      const createMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 'TEST1',
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .post('/matchs')
        .send(createMatchRequest)
        .then((response) => {
          expect(response.status).toBe(201);
          expect(response.body).toMatchObject(createMatchRequest);
          expect(response.body.id).toBeDefined();
          expect(response.body.id).toBeTruthy();
          expect(response).toBeDefined();
          done();
        })
    });
    it('POST should fail if homeTeamName or awayTeamName or date is empty', (done) => {
      const createMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: '',
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .post('/matchs')
        .send(createMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });
    it('POST should fail if string homeTeamName or awayTeamName or date > 31 carac', (done) => {
      const createMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: new Array(31).fill('a').join(''),
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .post('/matchs')
        .send(createMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });
    it('POST should fail if homeTeamName or awayTeamName or date =! string', (done) => {
      const createMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 4,
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .post('/matchs')
        .send(createMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });
    it('POST should fail if homeTeamScore or awayTeamScore =! number', (done) => {
      const createMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 'TEST1',
        awayTeamName: 'TEST2',
        homeTeamScore: 'string',
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .post('/matchs')
        .send(createMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });
  });

  describe('GET /matchs', () => {
    it('GET should resolve data', (done) => {
      request(app.getHttpServer())
        .get('/matchs')
        .then((response) => {
          expect(response).toBeDefined();
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBeTruthy();
          done();
        })
    });
    it(' GET should resolve a page', (done) => {
      request(app.getHttpServer())
        .get('/matchs?page=1&size=3')
        .then((response) => {
          expect(response).toBeDefined();
          expect(response.status).toBe(200);
          expect(response.body.length).toBe(3);
          expect(response.body[0].homeTeamName).toBe('TOTO0');
          done();
        })
    });
    it('GET should resolve 1 data', (done) => {
      request(app.getHttpServer())
        .get(`/matchs/${entityId}`)
        .then((response) => {
          expect(response).toBeDefined();
          expect(response.status).toBe(200);
          expect(response.body.homeTeamName).toBe('TOTO3');
          done();
        })
    });
  });

  describe('PATCH /matchs', () => {
    it('PATCH should patch data', (done) => {
      const patchMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 'TEST1',
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .patch(`/matchs/${entityId}`)
        .send(patchMatchRequest)
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body).toMatchObject(patchMatchRequest);
          expect(response.body.id).toBeDefined();
          expect(response.body.id).toBeTruthy();
          expect(response).toBeDefined();
          done();
        })
    });

    it('PATCH should fail if homeTeamName or awayTeamScore or date is empty', (done) => {
      const patchMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: '',
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .patch(`/matchs/${entityId}`)
        .send(patchMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });

    it('PATCH should fail if homeTeamName or awayTeamName or date > 30 carac', (done) => {
      const patchMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: new Array(31).fill('a').join(''),
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .patch(`/matchs/${entityId}`)
        .send(patchMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });

    it('UPDATE should fail if homeTeamName or awayTeamName or date is not a string', (done) => {
      const patchMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 4,
        awayTeamName: 'TEST2',
        homeTeamScore: 1,
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .patch(`/matchs/${entityId}`)
        .send(patchMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });
    it('UPDATE should fail if homeTeamScore or awayTeamScore is not a number', (done) => {
      const patchMatchRequest = {
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 'TEST1',
        awayTeamName: 'TEST2',
        homeTeamScore: 'string',
        awayTeamScore: 2
      };
      request(app.getHttpServer())
        .patch(`/matchs/${entityId}`)
        .send(patchMatchRequest)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response).toBeDefined();
          done();
        })
    });
  });

  describe('Should test db', () => {
    it('should test game collection', done => {
      const result = service.callFDP();
      result
        .then((matches) => {
          expect(matches.length).toBeGreaterThan(0);
          return matches
            .map((match) => plainToClass(MatchCreateValidationDto, match))
            .map(match => validate(match))
          })
        .then((promises) => {
          return Promise.all(promises)})
        .then(results => {
          for (const errors of results) {
              expect(errors.length).toBe(0);
             }
              done();
        })
        }, 50000);
    });

  describe('DELETE /matchs', () => {
    it('DELETE should remove data', (done) => {
      request(app.getHttpServer())
        .delete(`/matchs/${entityId}`)
        .then((response) => {
          expect(response.status).toBe(204);
          expect(response).toBeDefined();
          done();
        })
    });

    it('DELETE should fail 404', (done) => {
      request(app.getHttpServer())
        .delete(`/matchs/6233362a178ce494c8e9461e`)
        .then((response) => {
          expect(response.status).toBe(404);
          expect(response).toBeDefined();
          done();
        })
    });
  });
});
