import type { storageAdapter, Market, Bet, User } from '../core/types';

export class MemoryStorage implements storageAdapter {
    private markets: Map<string, Market> = new Map();
    private bets: Map<string, Bet> = new Map();
    private users: Map<string, User> = new Map();

    async getMarket(id: string): Promise<Market | null> {
        return this.markets.get(id) || null;
    }

    async getAllMarkets(): Promise<Market[]> {
        return Array.from(this.markets.values());
    }

    async saveMarket(market: Market): Promise<void> {
        this.markets.set(market.id, market);
    }

    async deleteMarket(id: string): Promise<void> {
        this.markets.delete(id);
    }

    async getBet(id: string): Promise<Bet | null> {
        return this.bets.get(id) || null;
    }

    async getAllBets(): Promise<Bet[]> {
        return Array.from(this.bets.values());
    }

    async saveBet(bet: Bet): Promise<void> {
        this.bets.set(bet.id, bet);
    }
    
    async deleteBet(id: string): Promise<void> {
        this.bets.delete(id);
    }

    async getUser(id: string): Promise<User | null> {
        return this.users.get(id) || null;
    }

    async getAllUsers(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    async saveUser(user: User): Promise<void> {
        this.users.set(user.id, user);
    }


    async clear(): Promise<void> {
        this.markets.clear();
        this.bets.clear();
        this.users.clear();
    }

    getStats(): {
        markets: number;
        bets: number;
        users: number;
    } {
        return {
            markets: this.markets.size,
            bets: this.bets.size,
            users: this.users.size,
        };
    }

    exportData(): { markets: Market[]; bets: Bet[]; users: User[] } {
        return {
            markets: Array.from(this.markets.values()),
            bets: Array.from(this.bets.values()),
            users: Array.from(this.users.values()),
        };
    }

    importData(data: { markets: Market[]; bets: Bet[]; users: User[] }): void {
        for (const market of data.markets) {
            this.markets.set(market.id, market);
        }
        for (const bet of data.bets) {
            this.bets.set(bet.id, bet);
        }
        for (const user of data.users) {
            this.users.set(user.id, user);
        }
    }
}

export class LocalStorage implements storageAdapter {

    private prefix: string;

    constructor(prefix: string = 'predict-sdk') {
        this.prefix = prefix;
    }

    private getKey(type: string, id?: string): string {
        return id ? `${this.prefix}:${type}:${id}` : `${this.prefix}:${type}`;
    }

    private getAllKeys(type: string): string[] {
        const keys: string[] = [];
        const prefix = this.getKey(type, '');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                keys.push(key.slice(prefix.length));
            }
        }
        return keys;
    }

    async getMarket(id: string): Promise<Market | null> {
        const data = localStorage.getItem(this.getKey('market', id));
        return data ? JSON.parse(data) : null;
    }

    async getAllMarkets(): Promise<Market[]> {
        return this.getAllKeys('market').map((key) => {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        }).filter(Boolean);
      }

    async saveMarket(market: Market): Promise<void> {
        localStorage.setItem(this.getKey('market', market.id), JSON.stringify(market));
    }

    async deleteMarket(id: string): Promise<void> {
        localStorage.removeItem(this.getKey('market', id));
    }

    async getBet(id: string): Promise<Bet | null> {
        const data = localStorage.getItem(this.getKey('bet', id));
        return data ? JSON.parse(data) : null;
    }

    async getBetsByMarket(marketID: string): Promise<Bet[]> {
        return this.getAllKeys('bet').map((key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }).filter((bet): bet is Bet => bet !== null && bet.marketID === marketID);
    }

    async getBetsByUser(userId: string): Promise<Bet[]> {
        return this.getAllKeys('bet').map((key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }).filter((bet): bet is Bet => bet !== null && bet.userId === userId);
    }
    async saveBet(bet: Bet): Promise<void> {
        localStorage.setItem(this.getKey('bet', bet.id), JSON.stringify(bet));
    }

    async getUser(id: string): Promise<User | null> {
        const data = localStorage.getItem(this.getKey('user', id));
        return data ? JSON.parse(data) : null;
    }

    async saveUser(user: User): Promise<void> {
        localStorage.setItem(this.getKey('user', user.id), JSON.stringify(user));
    }

    async clear(): Promise<void> {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    async getAllBets(): Promise<Bet[]> {
        return this.getAllKeys('bet').map((key) => {
            const data = localStorage.getItem(this.getKey('bet', key));
            return data ? JSON.parse(data) : null;
        }).filter(Boolean) as Bet[];
    }

    async deleteBet(id: string): Promise<void> {
        localStorage.removeItem(this.getKey('bet', id));
    }

    async getAllUsers(): Promise<User[]> {
        return this.getAllKeys('user').map((key) => {
            const data = localStorage.getItem(this.getKey('user', key));
            return data ? JSON.parse(data) : null;
        }).filter(Boolean) as User[];
    }

    getStats(): { markets: number; bets: number; users: number } {
        return {
            markets: this.getAllKeys('market').length,
            bets: this.getAllKeys('bet').length,
            users: this.getAllKeys('user').length,
        };
    }

    exportData(): { markets: Market[]; bets: Bet[]; users: User[] } {
        return {
            markets: this.getAllKeys('market').map((key) => {
                const data = localStorage.getItem(this.getKey('market', key));
                return data ? JSON.parse(data) : null;
            }).filter(Boolean) as Market[],
            bets: this.getAllKeys('bet').map((key) => {
                const data = localStorage.getItem(this.getKey('bet', key));
                return data ? JSON.parse(data) : null;
            }).filter(Boolean) as Bet[],
            users: this.getAllKeys('user').map((key) => {
                const data = localStorage.getItem(this.getKey('user', key));
                return data ? JSON.parse(data) : null;
            }).filter(Boolean) as User[],
        };
    }

    importData(data: { markets: Market[]; bets: Bet[]; users: User[] }): void {
        for (const market of data.markets) {
            localStorage.setItem(this.getKey('market', market.id), JSON.stringify(market));
        }
        for (const bet of data.bets) {
            localStorage.setItem(this.getKey('bet', bet.id), JSON.stringify(bet));
        }
        for (const user of data.users) {
            localStorage.setItem(this.getKey('user', user.id), JSON.stringify(user));
        }
    }
}