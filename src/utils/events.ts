import EventEmitter from 'eventemitter3';
import type { SDKEvent, EventType, EventCallback } from '../core/types';

export class TypedEventEmitter {
    private emitter = new EventEmitter();

    on<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
        this.emitter.on(event, callback as any);
        return () => this.emitter.off(event, callback as any);
    }

    once<T extends EventType>(event: T, callback: EventCallback<T>): void {
        this.emitter.once(event, callback as any);
    }

    off<T extends EventType>(event: T, callback: EventCallback<T>): void {
        this.emitter.off(event, callback as any);
    }

    emit(event: SDKEvent): void {
        this.emitter.emit(event.type, event);
    }

    onAny(callback: (event: SDKEvent) => void): () => void {
        const handler = (event: SDKEvent) => callback(event);

        const eventTypes: EventType[] = [
            'market:created',
            'market:updated',
            'market:closed',
            'market:resolved',
            'market:cancelled',
            'bet:placed',
            'bet:won',
            'bet:lost',
            'bet:refunded',
            'user:created',
            'user:balanceChanged',
        ]

        eventTypes.forEach((type) => this.emitter.on(type, handler));

        return () => {
            eventTypes.forEach((type) => this.emitter.off(type, handler));
        }
    }

    removeAllListeners(): void {
        this.emitter.removeAllListeners();
    }
}