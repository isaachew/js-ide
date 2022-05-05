let mimeTypes={"html":"text/html","css":"text/css","js":"application/javascript","json":"application/json"}


let req=indexedDB.open("filesys",1)
req.onupgradeneeded=a=>{
	console.log("upgradeneeded")
	let os=req.result.createObjectStore("files",{keyPath:"path"})
	os.createIndex("type","type")
	os.add({path:"",type:"folder",content:[]})
}

function waitFor(req){
    if(req.readyState=="done")return req.result
    return new Promise((res,rej)=>{
        req.onsuccess=e=>res(req.result)
        req.onerror=e=>rej(req.error)
    })
}
async function getObjStore(name){
    let trans=(await waitFor(req)).transaction(name,"readwrite")
	return trans.objectStore(name)
}
async function createFile(path,...content){
	let os=await getObjStore("files")
	let filename=path.match(/((?:\/[^/]+)*)\/([^/]+)/)
	let folder=await waitFor(os.get(filename[1]))
	if(!folder)throw new Error("directory does not exist")
	if(folder.content[filename[2]])throw new Error("file already exists")
	folder.content[filename[2]]={type:"file"}
	os.put(folder)
	os.add({path,type:"file",content:new File(content,path)})
}
async function updateFile(path,...content){
	let os=await getObjStore("files")
	let filename=path.match(/((?:\/[^/]+)*)\/([^/]+)/)
	let folder=await waitFor(os.get(filename[1]))
	if(!folder)throw new Error("directory does not exist")
	if(folder.content[filename[2]]==undefined){
		console.log("file does not exist; creating it")
		folder.content[filename[2]]={type:"file"}
		os.put(folder)
	}
	os.put({path,type:"file",content:new File(content,path)})
}

async function getFile(path){
	let trans=(await waitFor(req)).transaction("files","readwrite")
	let os=trans.objectStore("files")
	return await waitFor(os.get(path))
}
