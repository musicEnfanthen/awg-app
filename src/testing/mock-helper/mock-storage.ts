/**
 * The internal IMockStorage interface.
 *
 * It represents a mocked storage object.
 */
interface IMockStorage {
    /**
     * The getItem function of the mocked storage.
     */
    getItem: (key: string) => string;

    /**
     * The setItem function of the mocked storage.
     */
    setItem: (key: string, value: string) => void;

    /**
     * The removeItem function of the mocked storage.
     */
    removeItem: (key: string) => void;

    /**
     * The clear function of the mocked storage.
     */
    clear: () => void;
}

/**
 * Internal variable: sessionStore.
 *
 * It keeps the sessionStorage events.
 */
let sessionStore: { [key: string]: string } = {};

/**
 * Internal variable: localStore.
 *
 * It keeps the localStorage events.
 */
let localStore: { [key: string]: string } = {};

/**
 * Test helper: mockSessionStorage.
 *
 * It mocks the session storage object to catch storage events.
 */
export const mockSessionStorage: IMockStorage = {
    getItem: (key: string): string => (key in sessionStore ? sessionStore[key] : null),
    setItem: (key: string, value: string) => {
        sessionStore[key] = `${value}`;
    },
    removeItem: (key: string) => {
        delete sessionStore[key];
    },
    clear: () => {
        sessionStore = {};
    },
};

/**
 * Test helper: mockLocalStorage.
 *
 * It mocks the local storage object to catch storage events.
 */
export const mockLocalStorage: IMockStorage = {
    getItem: (key: string): string => (key in localStore ? localStore[key] : null),
    setItem: (key: string, value: string) => {
        localStore[key] = `${value}`;
    },
    removeItem: (key: string) => {
        delete localStore[key];
    },
    clear: () => {
        localStore = {};
    },
};
