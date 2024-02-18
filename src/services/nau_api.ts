import * as dotenv from 'dotenv';
import { LecturerFull, TGroup } from '../types';
dotenv.config({ path: '../../.env', });

export const callApi = async (path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: string) => {
    try {
        return await (
            await fetch(`${process.env.NAU_API_URL}/${path}`, {
                method,
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.NAU_API_TOKEN}`,
                },
                redirect: 'follow',
                body
            })
        ).json()
    } catch (e) { console.error('callApi', path, method, body, e); }
    return null
}

export const GetGroup = async (group_code: string) => { try { return (await callApi(`groups/?group_code=${group_code}`, 'GET'))?.groups?.[0] as TGroup } catch (e) { console.error(e) } return null }
export const Groups = async (faculty?: string) => { try { return (await callApi(`groups${faculty ? `?faculty=${faculty}` : ''}`, 'GET')).groups as TGroup[] } catch (e) { console.error(e) } return null }

export const GetFaculty = async (faculty: string) => {
    try {
        return (await callApi(`faculties/?code=${faculty}`, 'GET'))?.faculties?.[0] as {
            names: string[],
            code: string,
            specialities: {
                code: string,
                names: string[],
                lesson_templates: {
                    id: string, subgroup?: number, lecturers?: string[], names: string[], time?: number, duration?: number, places?: { place_type: "online" | "online_zoom" | "online_meet" | "online_classroom" | "online_other" | "offline"; text: string; }[], lesson_type?: string, created_by?: { app_code?: string | undefined; user_code?: string | undefined; }
                }[]
            }[]
        } | null
    } catch (e) { console.error(e) } return null
}

export const Lecturers = async () => {
    try {
        return (await callApi(`lecturers`, 'GET'))?.users as LecturerFull[]
    } catch (e) { console.error(e) }
    return []
}

export const GetLecturers = async (codes: string[]) => {
    try {
        return await callApi(`lecturers/getBulk`, 'POST', JSON.stringify({ codes })) as { code: string, name: string, surname: string, patronymic: string }[]
    } catch (e) { console.error(e) }
    return []
}