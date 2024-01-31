import { Document, model, Schema } from "mongoose";

export enum TMemberPermissions {
    addOnetimeChange = 'create-onetime-change',
    addLessons = 'add-lessons',
    removeLessons = 'remove-lessons',
    deleteLessons = 'delete-lessons',
};
export type TGroupMember = {
    code: string,
    permissions: Array<TMemberPermissions>
};
export type TGroup = {
    code: string,
    names: Array<string>,
    desc: string,
    telegram_ids: Array<bigint>,
    members: Array<TGroupMember>,
    owner: string | undefined,
    faculty: string,
    speciality: string,
    has_second_subgroup: boolean,
    is_deleted: boolean
};

export interface IGroup extends TGroup, Document { }

const groupsSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    telegram_ids: [BigInt],
});

const Groups = model<IGroup>("Groups", groupsSchema);

export default Groups;