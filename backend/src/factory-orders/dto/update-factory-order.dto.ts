import { PartialType } from '@nestjs/mapped-types';
import { CreateFactoryOrderDto } from './create-factory-order.dto';

export class UpdateFactoryOrderDto extends PartialType(CreateFactoryOrderDto) {}
