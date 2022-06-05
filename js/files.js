export let mimeTypes={"html":"text/html","htm":"text/html","css":"text/css","js":"application/javascript","json":"application/json","txt":"text/plain"}


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

function getType(path){
	let ext=path.match(/\.(.+)/)
	return mimeTypes[(ext||["","html"])[1]]||"text/html"
}

let curTransaction=null
async function getObjStore(){
    //if(curTransaction==null){
    curTransaction=(await waitFor(req)).transaction("files","readwrite")
    curTransaction.addEventListener("complete",a=>{
        curTransaction=null
    })
    //}
	return curTransaction.objectStore("files")
}

async function getParentEntry(os,path){
	if(path[0]!="/")throw new Error("path is not absolute")

	let filename=path.match(/((?:\/[^/]+)*)\/([^/]+)/)
	let folder=await waitFor(os.get(filename[1]))
	if(!folder)throw new Error("path does not exist")
    return {entry:folder,name:filename[2]}
}

async function createFile(path,content,type=null){
	let os=await getObjStore()
    let parent=await getParentEntry(os,path)
    if(parent.entry.content[parent.name])throw new Error("file already exists")
	parent.entry.content[parent.name]={type:"file"}
	os.put(parent.entry)

    os.add({path,type:"file",content:new File([content],path,{type:type??getType(path)})})
}

async function updateFile(path,content,type=null){
	let os=await getObjStore()
    let parent=await getParentEntry(os,path)
    if(parent.entry.content[parent.name]==undefined){
		console.log("file does not exist; creating it")
		parent.entry.content[parent.name]={type:"file"}
		os.put(parent.entry)
	}
	os.put({path,type:"file",content:new File(content,path,{type:type??getType(path)})})
}

async function createFolder(path){
	let os=await getObjStore()
    let parent=await getParentEntry(os,path)
    if(parent.entry.content[parent.name])throw new Error("file already exists")
	parent.entry.content[parent.name]={type:"folder"}
	os.put(parent.entry)
    os.add({path,type:"folder",content:{}})
}


async function deleteFile(path){
	let os=await getObjStore()
    let parent=await getParentEntry(os,path)
    if(parent.entry.content[parent.name]==undefined)throw new Error("file does not exist")
    if(parent.entry.content[parent.name].type=="parent.entry")throw new Error("file is a directory")
	delete parent.entry.content[parent.name]
	os.put(parent.entry)
	os.delete(path)
}
async function deleteFolder(path){
    let os=await getObjStore()
    let parent=await getParentEntry(os,path)
    if(parent.entry.content[parent.name]==undefined)throw new Error("file does not exist")
    if(parent.entry.content[parent.name].type=="file")throw new Error("file is a file")
	delete parent.entry.content[parent.name]
	os.put(parent.entry)
    os.delete(path)
	os.delete(IDBKeyRange.bound(path+"/",path+"0",false,true))

}

async function getFile(path){
	let os=await getObjStore()
	return await waitFor(os.get(path))
}


async function saveFiles(dir="",handle){
    if(!handle)handle=await showDirectoryPicker()
    let fileDesc=await getFile(dir)
    for(var entry in fileDesc.content){
        if(fileDesc.content[entry].type=="folder"){
            let newHandle=await handle.getDirectoryHandle(entry,{create:true})
            copyFiles(dir+"/"+entry,newHandle)
        }else{
            let fileHandle=await handle.getFileHandle(entry,{create:true})
            let writable=await fileHandle.createWritable()
            let fileEntry=await getFile(dir+"/"+entry)
            writable.write(new Blob([fileEntry.content]))
            writable.close()
        }
    }
}

async function loadFiles(dir="",handle){
    if(!handle)handle=await showDirectoryPicker()
    let fileDesc=await getFile(dir)
    for await(let entry of handle){
        if(entry[1].kind=="directory"){
            createFolder(dir+"/"+entry[0])
            loadFiles(dir+"/"+entry[0],entry[1])
        }else{
            let file=await entry[1].getFile()
            createFile(dir+"/"+entry[0],file)
        }
    }
}

export {createFile,createFolder,deleteFile,deleteFolder,getFile,updateFile,saveFiles,loadFiles,getType}
