interface Profiler {
    logger: ILogger;
    start: number;
    done(info?: any): boolean;
}

interface LogEntry {
    level: string;
    message: string;
    [optionName: string]: any;
}

interface LeveledLogMethod {
    (message: string, ...meta: any[]): ILogger;
    (message: any): ILogger;
    (infoObject: object): ILogger;
}

interface LogMethod {
    (level: string, message: string, ...meta: any[]): ILogger;
    (entry: LogEntry): ILogger;
    (level: string, message: any): ILogger;
}

export interface ILogger {
    log: LogMethod;
    clear(): this;
    close(): this;

    // for cli and npm levels
    error: LeveledLogMethod;
    warn: LeveledLogMethod;
    help: LeveledLogMethod;
    data: LeveledLogMethod;
    info: LeveledLogMethod;
    debug: LeveledLogMethod;
    prompt: LeveledLogMethod;
    http: LeveledLogMethod;
    verbose: LeveledLogMethod;
    input: LeveledLogMethod;
    silly: LeveledLogMethod;

    startTimer(): Profiler;
    profile(id: string | number, meta?: Record<string, any>): this;

    child(options: Object): this;

    isLevelEnabled(level: string): boolean;
    isErrorEnabled(): boolean;
    isWarnEnabled(): boolean;
    isInfoEnabled(): boolean;
    isVerboseEnabled(): boolean;
    isDebugEnabled(): boolean;
    isSillyEnabled(): boolean;
}