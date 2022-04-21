import { handleDocumentNotFound } from '@rendu-tp0/api/repository/error';
import {
  MatchCreateDto,
  MatchDto,
  MatchResetDto,
  MatchUpdateDto,
} from '@rendu-tp0/common/resource/match';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MatchDocument, MatchEntity } from './match.entity';
import {
  matchCreateDtoToEntity,
  matchDocumentToDto,
  matchResetDtoToEntity,
  matchUpdateDtoToEntity,
} from './match.mapper';
import { FilterParams, PaginationParams } from './match.controller';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { Node, NodeType, parse } from 'node-html-parser';
import {Log} from "@rendu-tp0/api/core/logging";

interface ParsedMatch {
  date: string;
  awayTeamName: string;
  homeTeamName: string;
  homeTeamScore: number;
  awayTeamScore: number;
}
@Injectable()
export class MatchService {
  constructor(
    @InjectModel(MatchEntity.name) private model: Model<MatchDocument>
  ) {}
  create(dto: MatchCreateDto): Promise<MatchDto> {
    const entity = matchCreateDtoToEntity(dto);
    return this.model.create(entity).then(matchDocumentToDto);
  }
  findAll(
    paginationParams: PaginationParams,
    filterParams: FilterParams
  ): Promise<MatchDto[]> {
    return this.model
      .find({
        ...(filterParams.homeTeamName
          ? { homeTeamName: filterParams.homeTeamName }
          : {}),
        ...(filterParams.awayTeamName
          ? { awayTeamName: filterParams.awayTeamName }
          : {}),
        ...(filterParams.team
          ? {
            $or: [
              { awayTeamName: filterParams.team },
              { homeTeamName: filterParams.team },
            ],
          }
          : {}),
        ...(filterParams.date
          ? {
            date: {
              $gte: new Date(filterParams.date),
              $lt: new Date(filterParams.date).setDate(
                new Date(filterParams.date).getDate() + 1
              ),
            },
          }
          : {}),
      })
      .skip((paginationParams.page - 1) * paginationParams.size)
      .limit(paginationParams.size)
      .exec()
      .then((entities) => entities.map(matchDocumentToDto));
  }
  findOne(id: string): Promise<MatchDto> {
    return this.model
      .findById(id)
      .orFail()
      .exec()
      .then(matchDocumentToDto)
      .catch(handleDocumentNotFound);
  }
  update(dto: MatchUpdateDto): Promise<MatchDto> {
    const entity = matchUpdateDtoToEntity(dto);
    return this.model
      .findByIdAndUpdate(entity.id, entity, { new: true })
      .orFail()
      .exec()
      .then(matchDocumentToDto)
      .catch(handleDocumentNotFound);
  }
  reset(dto: MatchResetDto): Promise<MatchDto> {
    const entity = matchResetDtoToEntity(dto);
    return this.model
      .findByIdAndUpdate(entity.id, entity, { new: true })
      .orFail()
      .exec()
      .then(matchDocumentToDto)
      .catch(handleDocumentNotFound);
  }
  remove(id: string): Promise<void> {
    return this.model
      .deleteOne({ _id: id })
      .orFail()
      .exec()
      .then(() => null)
      .catch(handleDocumentNotFound);
  }

  @Cron('30 3 * * 1,3,5')
  //call Football Data Pull
  async callFDP(): Promise<ParsedMatch[]> {
    const matches = await this.getMatchs(
      'https://www.matchendirect.fr/europe/ligue-des-champions-uefa/2022-15/',
      11
    );
    return matches;
  }
  async getMatchs(url, counter): Promise<ParsedMatch[]> {
    const count = counter - 1;
    let allMatches: ParsedMatch[] = [];
    if (count > 0) {
      let btn;
      await axios
        .get(url)
        .then((r) => r.data)
        .then((source) => parse(source))
        .then((html) => {
          btn = html.querySelector('a.objselect_prevnext.objselect_prec');
          return html.querySelector(
            'div#livescore .panel.panel-info .panel-body table.table.table-striped.table-hover'
          );
        })
        .then((elements) => Array.from(elements?.childNodes || []))
        .then(async (elements) => {
          const newurl =
            'https://www.matchendirect.fr' +
            btn.rawAttrs.split('" ')[0].split('="')[1];
          const games = [];
          let date = null;
          for (const element of elements) {
            const e: any = element;
            if (element.nodeType === NodeType.ELEMENT_NODE) {
              if (e.localName === 'thead') {
                date = e.querySelector('tr th')?.innerHTML || date;
              } else if (e.localName === 'tr') {
                this.parseMatch(e, date, games);
              }
            }
          }
          allMatches = [
            ...allMatches,
            ...games,
            ...(await this.getMatchs(newurl, count)),
          ];
        })
        .catch();
      this.pushInDb(allMatches);
    }
    return allMatches;
  }
  parseMatch(e, date: any, games) {
    games.push({
      homeTeamName: e.querySelector('.lm3 .lm3_eq1')?.innerText,
      awayTeamName: e.querySelector('.lm3 .lm3_eq2')?.innerText,
      homeTeamScore: Number(
        e.querySelector('.lm3 .lm3_score')?.innerText.split(' - ')[0]
      ),
      awayTeamScore: Number(
        e.querySelector('.lm3 .lm3_score')?.innerText.split(' - ')[1]
      ),
      date: this.parseDate(date, e.querySelector('.lm1')?.innerText),
    });
  }
  pushInDb(games: ParsedMatch[]) {
    games.forEach(async (game) => {
      return this.model
        .find({
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          date: game.date,
        })
        .then((e) => {
          if (e.length == 0) {
            this.model.create(game);
          }
        })
        .catch((err) => console.error(err));
    });
  }
  parseDate(date: any, hour) {
    const months = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];
    date = date.split(' ');
    date.shift();
    date[1] = String(months.indexOf(date[1]) + 1).padStart(2, '0');
    date = date.reverse();
    date = new Date(`${date.join(' ')} ${hour}`)?.toISOString();
    return date;
  }
}
