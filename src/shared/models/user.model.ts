export interface User {
    id?: string;
    firstName: string,
    lastName: string,
    email: string,
    username: string,
    password: string,
    age?: number,
    country?: string,
    gender?: string,
    pfp?: string,
    phone?: string,
    isAdmin: boolean,
}