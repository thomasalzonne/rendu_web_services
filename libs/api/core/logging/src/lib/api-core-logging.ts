import { Logger } from '@nestjs/common';
import { LogLevel } from '@nestjs/common/services/logger.service';

export function apiCoreLogging(): string {
  return 'api-core-logging';
}

export function Log(level: LogLevel = 'debug') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalFunction = descriptor.value;
    const functionName = originalFunction.name;

    const object: Record<string, any> & Partial<{ logger: Logger; }> = {
      [functionName]: function (...args: any[]) {
        this.logger?.[level]?.([propertyKey, 'start'].join(' - '));
        const result = originalFunction.apply(this, args);
        this.logger?.[level]?.([propertyKey, 'end'].join(' - '));
        return result;
      }
    };
    descriptor.value = object[functionName];
  };
}
