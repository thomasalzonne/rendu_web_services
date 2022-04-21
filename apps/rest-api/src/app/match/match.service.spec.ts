import { ApiException } from '@rendu-tp0/api/core/error';
import { MatchDto } from '@rendu-tp0/common/resource/match';
import { getModelToken } from '@nestjs/mongoose';
import { MockFactory, Test, TestingModule } from '@nestjs/testing';
import { Error, model, Model } from 'mongoose';
import { Observable } from 'rxjs';
import {
  MatchDocument,
  MatchEntity,
  MatchEntityWithId,
  MatchSchema,
} from './match.entity';
import { MatchService } from './match.service';
import * as mockingoose from 'mockingoose';
import { matchDocumentToDto } from './match.mapper';
import { match } from 'assert';
import axios from 'axios';
import { Node, NodeType, parse } from 'node-html-parser';
import {
  MatchCreateValidationDto,
  MatchValidationDto,
} from './match.validation';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

jest.mock('./match.mapper');

describe('MatchService', () => {
  let service: MatchService;
  let modelMock: Partial<Model<MatchDocument>>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchService],
    })
      .useMocker((token) => {
        if (token === getModelToken(MatchEntity.name)) {
          modelMock = model<MatchDocument>(MatchEntity.name, MatchSchema);
          const entities: MatchEntityWithId[] = [
            {
              id: '',
              date: new Date('2021-11-24T20:00:00.000Z'),
              homeTeamName: 'Equipe 1',
              awayTeamName: 'Equipe 2',
              homeTeamScore: 1,
              awayTeamScore: 2, 
            },
            {
              id: '',
              date: new Date('2021-11-24T20:00:00.000Z'),
              homeTeamName: 'Equipe 3',
              awayTeamName: 'Equipe 4',
              homeTeamScore: 1,
              awayTeamScore: 2,
            },
          ];
          mockingoose(modelMock)
            .toReturn(entities, modelMock.find.name)
            .toReturn(10, modelMock.count.name)
            .toReturn(entities[0], modelMock.findOne.name);
          return modelMock;
        }
      })
      .compile();
    service = module.get<MatchService>(MatchService);
    jest.setTimeout(60000);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('findAll', () => {
    it('should return an Observable', () => {
      const result = service.findAll(
        { page: 1, size: 2 },
        { homeTeamName: 'Equipe 1', awayTeamName: 'Equipe 2' }
      );
      expect(result).toBeInstanceOf(Promise);
    });
    it('should stream PaginatedItems items', (done) => {
      const result = service.findAll(
        { page: 1, size: 2 },
        { homeTeamName: 'Equipe 1', awayTeamName: 'Equipe 2' }
      );
      result.then((data) => {
        expect(data).toBeTruthy();
        expect(data).toBeInstanceOf(Array);
        done();
      });
    });
    it('should call mapper.mapEntitiesToDtos one time', (done) => {
      const mapperMock = matchDocumentToDto as unknown as jest.MockInstance<
        MatchDto,
        [MatchDocument]
        >;
      mapperMock.mockReturnValue({
        id: '',
        date: ('2022-03-08T20:00:00.000Z'),
        homeTeamName: 'Equipe 1',
        awayTeamName: 'Equipe 2',
        homeTeamScore: 1,
        awayTeamScore: 2,
      });
      const result = service.findAll(
        { page: 1, size: 2 },
        { homeTeamName: 'Equipe 1', awayTeamName: 'Equipe 2' }
      );
      result.then(() => {
        expect(mapperMock).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('should scrap matchs', () => {
    it('should scrap data', (done) => {
      const result = service.callFDP();
      expect(result).toBeInstanceOf(Promise);
      result
        .then((matchs) => {
          expect(matchs).toBeInstanceOf(Array);
          expect(matchs.length).toBeGreaterThanOrEqual(1);
          done();
        })
    });
    it('should parse valid matchs', (done) => {
      const result = service.callFDP();
      result
        .then((matches) => {
          expect(matches.length).toBeGreaterThan(0);
          return matches.map((match) => {
            const objInstance = plainToClass(MatchCreateValidationDto, match);
            return validate(objInstance);
          });
        })
        .then((promises) => {
          Promise.all(promises)
            .then((errors) =>
              errors.map((error) => {
                expect(error.length).toBe(0);
              })
            )
            done();
        });
    });

    it('should verify valid date', () => {
      const result = service.parseDate('Mardi 03 août 2021', '21:00');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(1);
    });

    it('should use pushInDb', () => {
      const result = service.callFDP();
      result.then( matchs => {
        expect(service.pushInDb(matchs)).toHaveBeenCalled()
      })
    })
  });
});
