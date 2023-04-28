import * as files from "./files.js"
var worker=null
var previewDir="./test/firstdir.html"
window.files=files
navigator.serviceWorker.getRegistration().then(e=>{
	worker=e.active

})

var selectedEntry=null


async function openFile(path){
	document.getElementById("fs").value=path
	let file=await files.getEntry(path)
	if(!file||file.type=="folder")return


	document.getElementById("frame").src=previewDir


	document.getElementById("editor").value=await file.content.text()



}

document.getElementById("fs").addEventListener("change",e=>{
	openFile(e.target.value)
})

document.getElementById("folderCreate").addEventListener("click",a=>{
	files.createFolder(document.getElementById("folderLocation").value)
})


document.getElementById("editor").addEventListener("beforeinput",a=>{
	console.log(a.inputType)
	if(a.inputType=="insertLineBreak"){
		let lineStart=("\n"+a.target.value).slice(0,a.target.selectionStart).lastIndexOf("\n")

		let indent=a.target.value.slice(lineStart).match(/\s*/)[0]

		a.target.setRangeText("\n"+indent,a.target.selectionStart,a.target.selectionEnd,"end")
		a.preventDefault()
	}
})

async function save(e){

	files.updateFile(document.getElementById("fs").value,[document.getElementById("editor").value])
	document.getElementById("frame").contentWindow.location.reload()




}
document.getElementById("save").addEventListener("click",save)


function createFileEntryEl(path,fileObj){
	let fileEl=document.createElement("div")
	let fname=fileObj.name
	let nameEl=document.createElement("div")
	nameEl.className="entryname"
	fileEl.appendChild(nameEl)
	nameEl.append(fname)
	if(fileObj.type=="file"){
		fileEl.className="fileentry"
	}else if(fileObj.type=="folder"){
		fileEl.className="folderentry closed"
		let contentEl=document.createElement("div")
		fileEl.appendChild(contentEl)
		contentEl.className="foldercontent"
	}
	nameEl.addEventListener("click",e=>{
		if(selectedEntry!=path){
			selectedEntry=path;
			[...document.querySelectorAll(".selected")].map(a=>a.classList.remove("selected"))
			nameEl.classList.add("selected")
			return
		}
		if(fileObj.type=="file"){
			openFile(path)
		}else if(fileObj.type=="folder"){
			if(fileEl.classList.contains("closed")){
				fileEl.classList.remove("closed")
				fileEl.classList.add("open")
				if(!fileEl.classList.contains("init")){
					fileEl.classList.add("init")
					expandFolder(fileEl.children[1],path,fileObj.index)
				}
			}else{
				fileEl.classList.remove("open")
				fileEl.classList.add("closed")
			}
		}
	})
	return fileEl
}
async function expandFolder(el,path,index){
	let folder=await files.getEntryByIndex(index)
	console.log(folder)
	for(let [name,{type,index:chIndex}] of folder.content){
		console.log(name,type,chIndex)
		let fileEl=document.createElement("div")
		el.appendChild(createFileEntryEl(path+"/"+name,await files.getEntryByIndex(chIndex)))
		/*
		if(folder.content[i].type=="folder"){
			//create folder
			fileEl.className="folderentry closed"
			let folderNameEl=document.createElement("div")
			folderNameEl.className="entryname"
			folderNameEl.append(i)
			let folderContentEl=document.createElement("div")
			folderContentEl.style.paddingLeft="10px"
			folderNameEl.addEventListener("click",e=>{
				if(fileEl.classList.contains("closed")){
					fileEl.classList.remove("closed")
					fileEl.classList.add("open")
					let isInit=fileEl.classList.contains("initialised")
					if(!isInit){
						fileEl.classList.add("initialised")
						expandFolder(folderContentEl,dir+"/"+i)
					}else{
						folderContentEl.style.display="block"
					}
				}else{
					fileEl.classList.remove("open")
					fileEl.classList.add("closed");
					folderContentEl.style.display="none"
				}
			})
			fileEl.append(folderNameEl,folderContentEl)
		}else{
			fileEl.className="fileentry"
			fileEl.append(i)
			fileEl.addEventListener("click",e=>{
				//shift-click to view
				if(selectedEntry==dir+"/"+i){
					openFile(dir+"/"+i)
				}else{
					selectedEntry=dir+"/"+i

					fileEl.class="red"
					if(e.shiftKey)previewDir="./test"+dir+"/"+i
				}
			})
		}
		el.append(fileEl)
		*/
	}
}
document.addEventListener("keydown",e=>{
	switch(e.key){
		case "Backspace":
		console.log(e,selectedEntry)
		files.deleteEntry(selectedEntry,1)
		break;
	}
})


document.getElementById("upload").addEventListener("click",()=>{
	files.createFolder("/newfile")
	files.loadFiles("/newfile")
})
/*
document.getElementById("download").addEventListener("click",()=>{
	files.saveFiles("")
})
*/

displaySource.addEventListener("change",e=>{
	document.getElementById("frame").contentWindow.location="test"+e.target.value
})

expandFolder(document.getElementById("fileview"),"","")

navigator.serviceWorker.register("worker.js",{type:"module"})
