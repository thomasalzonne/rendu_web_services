import { handleDocumentNotFound } from '@rendu-tp0/api/repository/error';
import {
  EquipeCreateDto,
  EquipeDto,
  EquipeResetDto,
  EquipeUpdateDto,
} from '@rendu-tp0/common/resource/equipe';
import {Injectable, Logger} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipeDocument, EquipeEntity } from './equipe.entity';
import {
  equipeCreateDtoToEntity,
  equipeDocumentToDto,
  equipeResetDtoToEntity,
  equipeUpdateDtoToEntity,
} from './equipe.mapper';
import { PaginationParams } from './equipe.controller';
import { Cron } from '@nestjs/schedule';
import {log} from "winston";
import {Log} from "@rendu-tp0/api/core/logging";
import axios from "axios";
import {map} from "rxjs";
import {parse} from "node-html-parser";

interface ParsedBook {
  title: string;
  author: string;
  pictureUrl: string;
}

@Injectable()
export class EquipeService {
  constructor(
    @InjectModel(EquipeEntity.name) private model: Model<EquipeDocument>
  ) {}
    protected logger = new Logger(EquipeService.name);

  create(dto: EquipeCreateDto): Promise<EquipeDto> {
    const entity = equipeCreateDtoToEntity(dto);
    return this.model.create(entity).then(equipeDocumentToDto);
  }

  /*@Cron('30 * * * * *')
  @Log()
  test() : Promise<ParsedBook[]> {
    const url = 'https://www.lalibrairie.com/livres/bestseller.html';
    return axios.get(url)
      .then(res => parse(res.data))
      .then(rootDocument => [...rootDocument.querySelectorAll('.liste-livres > .col-sm-4')]
        .map(book => ({
          title: book.querySelector('.infos h2 a').innerText,
          author: book.querySelector('.infos .auteur').innerText,
          pictureUrl: new URL(url).origin + book.querySelector('.couverture picture img').getAttribute('src')
        }))
      )
  }*/

  findAll(paginationParams: PaginationParams): Promise<EquipeDto[]> {
    return this.model
      .find()
      .skip((paginationParams.page - 1) * paginationParams.size)
      .limit(paginationParams.size)
      .exec()
      .then((entities) => entities.map(equipeDocumentToDto));
  }

  findOne(id: string): Promise<EquipeDto> {
    return this.model
      .findById(id)
      .orFail()
      .exec()
      .then(equipeDocumentToDto)
      .catch(handleDocumentNotFound);
  }

  update(dto: EquipeUpdateDto): Promise<EquipeDto> {
    const entity = equipeUpdateDtoToEntity(dto);
    return this.model
      .findByIdAndUpdate(entity.id, entity, { new: true })
      .orFail()
      .exec()
      .then(equipeDocumentToDto)
      .catch(handleDocumentNotFound);
  }

  reset(dto: EquipeResetDto): Promise<EquipeDto> {
    const entity = equipeResetDtoToEntity(dto);
    return this.model
      .findByIdAndUpdate(entity.id, entity, { new: true })
      .orFail()
      .exec()
      .then(equipeDocumentToDto)
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
}
