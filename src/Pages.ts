export interface ILinkPage{
	link:string
	title:string
}

export interface IUploadPage{
	title:string
	logoImage:string
	uploadUrl:string
	fieldName:string
	emptySpace:string
	fileAmountNOW:string
	fileAmountALL:string
	fileSize:string
}

export interface IErrorPage{
	title:string
	errorMessage:string
}