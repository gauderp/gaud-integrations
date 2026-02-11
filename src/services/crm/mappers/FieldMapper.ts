/**
 * FieldMapper - Mapeia campos entre CRM e formato interno
 */

import type { FieldDefinition } from '../../../models/crm.types';

export class FieldMapper {
  /**
   * Mapear campo Pipedrive para FieldDefinition interno
   */
  mapPipedriveFieldToDefinition(field: any): FieldDefinition {
    const fieldType = this.mapPipedriveFieldType(field.field_type);

    return {
      id: field.id.toString(),
      name: field.key,
      label: field.name,
      type: fieldType,
      required: field.mandatory === true,
      readOnly: false,
      placeholder: field.description,
      crmFieldName: field.key,
      crmType: 'pipedrive',
      options: field.options ? this.mapPipedriveOptions(field.options) : undefined,
    };
  }

  /**
   * Mapear tipo de campo Pipedrive para tipo interno
   */
  private mapPipedriveFieldType(pipedriveType: string): FieldDefinition['type'] {
    const typeMap: Record<string, FieldDefinition['type']> = {
      text: 'text',
      varchar: 'text',
      varchar_auto: 'text',
      int: 'number',
      double: 'number',
      monetary: 'currency',
      date: 'date',
      datetime: 'date',
      time: 'text',
      email: 'email',
      phone: 'phone',
      address: 'text',
      textarea: 'textarea',
      autocomplete: 'select',
      select: 'select',
      enum: 'select',
      user: 'select',
      org: 'select',
      people: 'select',
      status: 'select',
      visible_deal_status: 'select',
      activeFlag: 'checkbox',
    };

    return typeMap[pipedriveType] || 'text';
  }

  /**
   * Mapear opções de campo select
   */
  private mapPipedriveOptions(options: any[]): Array<{ value: string; label: string }> {
    if (Array.isArray(options)) {
      return options.map((opt: any) => ({
        value: opt.id.toString(),
        label: opt.label,
      }));
    }

    if (typeof options === 'object') {
      return Object.entries(options).map(([key, value]: [string, any]) => ({
        value: key,
        label: value.label || value,
      }));
    }

    return [];
  }
}
