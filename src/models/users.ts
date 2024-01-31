import { Document, model, Schema } from "mongoose";

export type TUser = {
    code: string,
    name: string,
    surname: string,
    patronymic: string,
    password?: string,
    desc: string,
    telegram_ids: Array<bigint>,
    account_flags: Array<string>,
    is_deleted: boolean
};

export interface IUser extends TUser, Document { }

const usersSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    telegram_ids: [BigInt],
});

const Users = model<IUser>("Users", usersSchema);

export default Users;