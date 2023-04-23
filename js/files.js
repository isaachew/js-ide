let req=indexedDB.open("filesys",1);
req.onupgradeneeded=e=>{
    console.log("created database")
    let db=req.result;
    let fileStore=db.createObjectStore("files",{keyPath:"index",autoIncrement:true})
    fileStore.createIndex("name","name")
    fileStore.add({name:"",type:"folder",content:new Map(),index:""})
}
function waitFor(req){//converts IDBRequest to Promise
    if(req.readyState=="done"){
        console.log("readystate")
        return req.result
    }
    return new Promise((res,rej)=>{
        req.onsuccess=e=>res(req.result)
        req.onerror=e=>rej(req.error)
    })
}

export let mimeTypes={"html":"text/html","htm":"text/html","css":"text/css","js":"application/javascript","json":"application/json","txt":"text/plain"}

function getMimeType(path){
	let [,,ext]=path.split(/([^.]*\.)+([^.]*)/)
	return mimeTypes[ext]||""
}

let curTransaction=null
let objStore=null
async function getObjStore(){
    if(curTransaction==null){
	    curTransaction=(await waitFor(req)).transaction("files","readwrite")
		objStore=curTransaction.objectStore("files")
	    curTransaction.addEventListener("complete",a=>{
	        curTransaction=null
			objStore=null
	    })
    }
	return objStore
}

export async function getEntryByIndex(index){
    let obs=await getObjStore()
    let curNode=await waitFor(obs.get(index))
    return curNode
}

export async function getEntry(path){
    let obs=await getObjStore()
    let [root,...parts]=path.split("/")
    let curNode=await waitFor(obs.get(root))
    for(var name of parts){
        if(curNode.type!="folder")return null
        let newNodeInfo=curNode.content.get(name)
        if(!newNodeInfo)return null
        curNode=await waitFor(obs.get(newNodeInfo.index))
    }
    return curNode
}
async function getChildWithName(dirObj,name){
    let newNodeIndex=dirObj.content.get(name).index
    if(!newNodeIndex)return null
    curNode=await waitFor(obs.get(newNodeIndex))
    return curNode
}

async function updateEntry(path,type,content,update=false){
    let obs=await getObjStore()
    let pathParts=path.split("/")
    let name=pathParts.pop()
    if(pathParts.length==0)throw new Error("no root")
    let parent=pathParts.join("/")
    let pEntry=await getEntry(parent)
    if(pEntry?.type!="folder")throw new Error("path does not exist")
    if(pEntry.content.has(name)&&!update)throw new Error("file already exists")
    if(type=="file"){
        content=new File(content,name,{type:getMimeType(name)})
    }
    let newEntry={name,type,content}
    if(update&&pEntry.content.has(name)){
        newEntry.index=pEntry.content.get(name).index
    }
    let index=await waitFor(obs.put(newEntry))
    pEntry.content.set(name,{type,index})
    obs.put(pEntry)
}

export async function createFile(path,content){
    updateEntry(path,"file",content)
}

export async function updateFile(path,content){
    updateEntry(path,"file",content,true)
}

export async function createFolder(path){
    updateEntry(path,"folder",new Map())
}

async function deleteByIndex(index){//assume that deleted from parent
    let obs=await getObjStore()
    let entryData=await waitFor(obs.get(index))
    console.log(`deleting index ${index} / name ${entryData.name}`)
    if(entryData.type=="folder"){
        for(var [name,{index:childIndex}] of entryData.content){
            deleteByIndex(childIndex)
        }
    }
    obs.delete(index)

}

export async function deleteEntry(path,folder=false){
    let obs=await getObjStore()
    let pathParts=path.split("/")
    let name=pathParts.pop()//last segment of path
    if(pathParts.length==0)throw new Error("no root")
    let parent=pathParts.join("/")
    let pEntry=await getEntry(parent)
    if(pEntry==undefined)throw new Error("path does not exist")
    if(!pEntry.content.has(name))return;//file does not exist
    let entryData=pEntry.content.get(name)
    if(entryData.type=="folder"&&!folder){
        return
    }
    deleteByIndex(entryData.index)
    pEntry.content.delete(name)
    obs.put(pEntry)
}
