import sqlite3 from "sqlite3"
import { open } from "sqlite"

const dbConfig = {
	tableName: `Files`,
	filenameColumn: `filename`,
	passwordColumn: `password`,
	filesizeColumn: `filesize`,
	secretenameColumn: `secretname`,
	originalnameColumn: `originalname`
}

interface IFile{
	filename:string
	password:string
	filesize:number
	secretname:string
	originalname:string
}

const printables = "abcdefgABCDEFG0123456789"

export class FilesDatabase{
	db
	constructor(dbPath:string){
		this.db = open({
			filename: dbPath,
			driver :sqlite3.Database
		}).then((db)=> db)
	}
	
	async tryToCreateTable():Promise<boolean>{
		const sql = `CREATE TABLE ${dbConfig.tableName}
		(
			id INTEGER PRIMARY KEY, 
			${dbConfig.filenameColumn}, 
			${dbConfig.passwordColumn}, 
			${dbConfig.filesizeColumn}, 
			${dbConfig.secretenameColumn},
			${dbConfig.originalnameColumn}
		)`

		console.log("Creating table,","sql:",sql)

		const result = (await this.db).exec(sql).then(()=>true,()=>false)

		return result
	}

	async addFile(file:IFile):Promise<boolean>{
		const sql = `INSERT INTO ${dbConfig.tableName}
		(
			${dbConfig.filenameColumn}, 
			${dbConfig.passwordColumn}, 
			${dbConfig.filesizeColumn}, 
			${dbConfig.secretenameColumn},
			${dbConfig.originalnameColumn}
		) 
		VALUES(?,?,?,?,?)`

		return (await this.db).run(sql,[file.filename,file.password,file.filesize,file.secretname,file.originalname]).then(()=>true,(err)=>{
			console.log(err)
			return false
		})
	}

	async getFileAmount():Promise<number>{
		const sql = `SELECT ${dbConfig.filesizeColumn} FROM ${dbConfig.tableName} `
		return (await this.db).all(sql).then((rows)=>{
			return rows.length
		},()=>0)
	}

	async getStorageSize():Promise<number>{
		const sql = `SELECT ${dbConfig.filesizeColumn} FROM ${dbConfig.tableName} `
		return (await this.db).all(sql).then((rows)=>{
			let sum = 0
			for (const row of rows) {
				sum += row.filesize
			}
			return sum
		},()=>0)
	}
	
	// updateFile(){
	// 	const sql = `UPDATE ${dbConfig.tableName} SET `
	// }

	async removeFile(secret:string):Promise<boolean>{
		const sql = `DELETE from ${dbConfig.tableName} WHERE ${dbConfig.secretenameColumn}='${secret}'`

		return (await this.db).run(sql).then((res)=>{

			return true
		},(err)=>{
			console.log(err)
			return false
		})

	}

	async fileExists(filename:string):Promise<boolean>{
		const sql = `SELECT * FROM ${dbConfig.tableName} WHERE ${dbConfig.filenameColumn}='${filename}' `

		return (await this.db).all(sql).then((rows)=>{
			return rows.length > 0
		},()=>false)
	}

	async getFile(secret:string,password:string):Promise<IFile|null>{
		const sql = `SELECT * FROM ${dbConfig.tableName} WHERE ${dbConfig.secretenameColumn}='${secret}' AND ${dbConfig.passwordColumn}='${password}'`

		return (await this.db).all(sql).then((rows)=>{
			return {
				filename:	rows[0].filename,
				password:	rows[0].password,
				filesize:	0,
				secretname: rows[0].secretname,
				originalname: rows[0].originalname
			}
		},()=>null)
	}

	async getWholeTable(){
		const sql = `SELECT * FROM ${dbConfig.tableName}`
		return (await this.db).all(sql).then((rows)=>rows,()=>[])
	}

	async clear(){
		const sql = `DELETE * from ${dbConfig.tableName}`
		await (await this.db).run(sql).then(()=>true,()=>false)
	}

	async getRandomFileName(size:number):Promise<string>{
		let text = ""
		for (let i = 0; i < size; i++) {
			text += printables.charAt(Math.floor(Math.random() * printables.length))
		}

		await this.fileExists(text).then(async (exists)=>{
			if(exists){
				console.log("tried to get random name:",text,", but it already exists")
				text = await this.getRandomFileName(size).then((res)=>res)
			}
		})
		return text
	}
}