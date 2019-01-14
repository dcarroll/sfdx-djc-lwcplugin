'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import * as find from 'find';

interface LwcData {
    name: string;
    directory: string;
    targets: {}; 
    isExposed: boolean;
    apiVersion: string;
    masterLabel: string;
    description: string;
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    vscode.window.showInformationMessage('Started');
    context.subscriptions.push(vscode.commands.registerCommand('createLWCComponent.start', () => {
        const panel = vscode.window.createWebviewPanel('createLWCComponent', "New LWC Component", vscode.ViewColumn.One, {
            enableScripts: true
        });

        const onDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'src/webviews', 'options.html'));
        const onDiskCssPath = vscode.Uri.file(path.join(context.extensionPath, 'src/webviews/styles/styles', 'slds.css'));

        const wsf = vscode.workspace.workspaceFolders;
        const wsff = wsf ? wsf : [];
        const lwcFolders = find.dirSync('lwc', wsff[0].uri.fsPath);

        fs.readFile(onDiskPath.with( { scheme: 'vscode-resource'}).fsPath, null, (err, data) => {
            fs.readFile(onDiskCssPath.with( { scheme: 'vscode-resource'}).fsPath, null, (err, cssdata) => {
                var htmlString = data.toString().replace('style-here { x: 1 }', cssdata.toString());
                panel.webview.html = htmlString;
            } );
        });
        
        /* const data = { 
            name: '', 
            directory: '', 
            targets: {}, 
            isExposed: true,
            apiVersion: '45.0',
            masterLabel: 'Default Mater Label',
            description: 'Super inadequate description of functionality'
        }; */

        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'ready':
                    panel.webview.postMessage({ type: 'foldersready', dirs: lwcFolders });
                    return;
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
                case 'options':
                    const data: LwcData = JSON.parse(message.text);
                    // let output = 'Will create a componenet named: ' + data.name;
                    console.log(JSON.stringify(data, null, 4));
                    
                    /* for (const key in data) {
                        if (data.hasOwnProperty(key) && key !== 'name') {
                            output += '\n' + key + ' = ' + data[key];
                        }
                    } */
                    // const wsp = vscode.workspace;
                    
                    const result = childProcess.execSync('sfdx force:lightning:component:create -n ' + data.name + ' --type lwc -d ' + data.directory);
                    updateMetaXml(data);
                    vscode.window.showInformationMessage(result.toString());
                    panel.dispose();
                    return;
            }
        }, undefined, context.subscriptions);
    }));
}

const options = {
    attributeNamePrefix : "",
    attrNodeName: "attr", //default is 'false'
    textNodeName : "#text",
    ignoreAttributes : false,
    ignoreNameSpace : false,
    allowBooleanAttributes : false,
    parseNodeValue : true,
    parseAttributeValue : false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    localeRange: "", //To support non english character in tag/attribute values.
    parseTrueNumberOnly: false
};

function updateMetaXml(data: LwcData) {
    var Parser = require("fast-xml-parser").j2xParser;
    var parse = require("fast-xml-parser");

    let metaxml = fs.readFileSync(path.join(data.directory, data.name, data.name + '.js-meta.xml')).toString();
    const metajson = parse.parse(metaxml, options);
    const lcb = metajson.LightningComponentBundle;
    lcb.isExposed = data.isExposed;
    lcb['masterLabel'] = data.masterLabel;
    lcb['description'] = data.description;
    lcb['targets'] = {target: []};
    for (const key in data.targets) {
        lcb.targets.target.push(key);
    }
    var defaultOptions = {
        attributeNamePrefix : "",
        attrNodeName: "attr", //default is false
        textNodeName : "#text",
        ignoreAttributes : false,
        cdataTagName: "__cdata", //default is false
        cdataPositionChar: "\\c",
        format: true,
        indentBy: "    ",
        supressEmptyNode: false
    };
    var parser = new Parser(defaultOptions);
    metaxml = '<?xml version="1.0" encoding="UTF-8"?>\n' + parser.parse(metajson);
    console.log(metaxml);
    fs.writeFileSync(path.join(data.directory, data.name, data.name + '.js-meta.xml'), metaxml);
}

// this method is called when your extension is deactivated
export function deactivate() {
}