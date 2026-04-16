/** YApi `/api/interface/get` 返回的 data 形状（generateCode 所需字段） */
export interface ReqQuery {
	name: string;
	required: string;
	desc: string;
	example?: string;
}

export interface InterfaceDetail {
	_id?: number;
	title: string;
	path: string;
	method: string;
	req_query?: ReqQuery[];
	req_body_other?: string;
	res_body?: string;
	[key: string]: unknown;
}

export interface YapiEnvelope<T> {
	errcode: number;
	errmsg: string;
	data: T;
}
