let req=indexedDB.open("filesys",1);
req.onupgradeneeded=e=>{
    console.log("created database")
    let db=req.result;
    let fileStore=db.createObjectStore("files",{keyPath:"index",autoIncrement:true})
    fileStore.createIndex("name","name")
    fileStore.add({name:"",type:"folder",content:new Map(),index:"",parent:null})
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
	let ext=path.match(/([^.]*\.)+([^.]*)/)?.[2]
	return mimeTypes?.[ext]||""
}

let curTransaction=null
let objStore=null
async function genObjectStore(){
    curTransaction=(await waitFor(req)).transaction("files","readwrite")
    objStore=curTransaction.objectStore("files")
    return objStore
}
async function getObjStore(){
    if(curTransaction==null){
        return genObjectStore()
	    /*
        impossible to detect if a transaction is complete or not
	    curTransaction.addEventListener("complete",a=>{
            console.log("transaction completed")
	        curTransaction=null
			objStore=null
	    })
        */
        /*
        setTimeout(()=>{
            curTransaction=null
			objStore=null
        })
        */
    }else{
        try{
            return curTransaction.objectStore("files");
        }catch{
            curTransaction=null
            return genObjectStore()
        }
    }
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

async function createEntryByIndex(parent,name,type,content,update=false){
    let obs=await getObjStore()
    let pEntry=await getEntryByIndex(parent)
    if(pEntry?.type!="folder")throw new Error("path does not exist")
    if(pEntry.content.has(name)&&!update)throw new Error("file already exists")
    if(type=="file"&&!(content instanceof File)){
        content=new File([content].flat(Infinity),name,{type:getMimeType(name)})
    }
    if(type=="folder"&&!(content instanceof Map)){
        content=new Map()
    }
    let newEntry={name,type,content,parent}
    if(update&&pEntry.content.has(name)){
        newEntry.index=pEntry.content.get(name).index
    }
    let index=await waitFor(obs.put(newEntry))
    pEntry.content.set(name,{type,index})
    await waitFor(obs.put(pEntry))
    return index
}

async function createEntry(path,type,content,update=false){
    let obs=await getObjStore()
    let pathParts=path.split("/")
    let name=pathParts.pop()
    if(pathParts.length==0)throw new Error("no root")
    let parent=pathParts.join("/")
    let pEntry=await getEntry(parent)
    if(pEntry?.type!="folder")throw new Error("path does not exist")
    return createEntryByIndex(pEntry.index,name,type,content,update)
}

export async function createFile(path,content){
    return await createEntry(path,"file",content)
}

export async function updateFile(path,content){
    return await createEntry(path,"file",content,true)
}

export async function createFolder(path){
    await createEntry(path,"folder",new Map())
}
export async function moveEntryByIndex(index,name,findex){
    let obs=await getObjStore()
    let curEntry=await getEntryByIndex(index)
    if(curEntry==undefined)throw new Error("no entry to move")//no entry
    let parentIndex=curEntry.parent
    if(parentIndex==null)return//is root
    let parentEntry=await getEntryByIndex(parentIndex)
    let newParent=await getEntryByIndex(findex)
    if(newParent?.type!="folder")return//new parent not eligible
    if(newParent.content.has(name))return//file already exists
    let oldName=curEntry.name
    curEntry.name=name
    if(parentIndex==findex){//rename
        let oldEntry=parentEntry.content.get(oldName)
        parentEntry.content.delete(oldName)
        parentEntry.content.set(name,oldEntry)
        obs.put(curEntry)
        obs.put(parentEntry)
        return
    }
    curEntry.parent=findex
    newParent.content.set(name,parentEntry.content.get(oldName))
    parentEntry.content.delete(oldName)
    obs.put(curEntry)
    obs.put(parentEntry)
    obs.put(newParent)
}
export async function moveEntry(path,newPath){
    let newPathParts=newPath.split("/")
    let newName=newPathParts.pop()||null
    if(newPathParts.length==0)throw new Error("no root")
    let newParent=newPathParts.join("/")
    let oldEntry=await getEntry(path)
    if(oldEntry==null)throw new Error("file does not exist")
    if(newName==null)newName=oldEntry.name
    let parentEntry=await getEntry(newParent)
    if(parentEntry==null)throw new Error("new path does not exist")
    await moveEntryByIndex(oldEntry.index,newName,parentEntry.index)
}

export async function deleteByIndex(index){//assume that deleted from parent
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

export async function writeFileList(index="",list=null){
    if(list==null){
        list=await genFileList()
        console.log(list)
    }
    if(list[1] instanceof Array){
        let asdf=await createEntryByIndex(index,list[0],"folder")
        for(var entry of list[1]){
            await writeFileList(asdf,entry)
        }
    }else{
        await createEntryByIndex(index,list[0],"file",list[1])
    }
}
export async function genFileList(handle=null){
    if(handle==null)handle=await window.showDirectoryPicker()
    if(handle.kind=="directory"){
        let items=[]
        for await(var [a,b] of handle){
            items.push(await genFileList(b))
        }
        return [handle.name,items]
    }else{
        return [handle.name,await handle.getFile()]
        //await createEntryByIndex(index,handle.name,"file",)
    }
}
