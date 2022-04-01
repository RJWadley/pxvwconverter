import { parse } from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  var disposable = vscode.commands.registerTextEditorCommand(
    "extension.vwToPx",
    function (textEditor, textEditorEdit) {
      var regexStr = "([0-9]*\\.?[0-9]+)vw";
      placeholder(
        regexStr,
        (match, value, unit, viewportWidth) =>
          `${vw2Px(parseFloat(value), viewportWidth)}px`,
        textEditor,
        textEditorEdit
      );
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerTextEditorCommand(
    "extension.pxToVw",
    function (textEditor, textEditorEdit) {
      const config = vscode.workspace.getConfiguration("pxVwConverter");
      var regexStr = "([0-9]*\\.?[0-9]+)px";
      placeholder(
        regexStr,
        (match, value, unit, viewportWidth) =>
          `${px2Vw(parseFloat(value), viewportWidth)}vw`,
        textEditor,
        textEditorEdit
      );
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerTextEditorCommand(
    "extension.pxToVwAndVwToPx",
    function (textEditor, textEditorEdit) {
      const config = vscode.workspace.getConfiguration("pxVwConverter");
      var regexStr = "([0-9]*\\.?[0-9]+)(px|vw)";
      placeholder(
        regexStr,
        (match, value, unit, viewportWidth) =>
          unit === "px"
            ? `${px2Vw(parseFloat(value), viewportWidth)}vw`
            : `${vw2Px(parseFloat(value), viewportWidth)}px`,
        textEditor,
        textEditorEdit
      );
    }
  );

  context.subscriptions.push(disposable);
}

function px2Vw(px: number, viewportWidth: number) {
  if (viewportWidth === 0) {
    return 0;
  }
  const config = vscode.workspace.getConfiguration("pxVwConverter");
  var unitPrecision: number | undefined = config.get("unitPrecisionVw");
  const value = parseFloat(((px * 100) / viewportWidth).toFixed(unitPrecision));
  return value;
}
function vw2Px(vw: number, viewportWidth: number) {
  console.log(vw, viewportWidth);
  const config = vscode.workspace.getConfiguration("pxVwConverter");
  var unitPrecision: number | undefined = config.get("unitPrecisionPx");
  const value = parseFloat(((vw / 100) * viewportWidth).toFixed(unitPrecision));
  console.log(value);
  return value;
}

function placeholder(
  regexString: string,
  replaceFunction: (
    match: string,
    value: string,
    unit: string,
    viewportWidth: number
  ) => string,
  textEditor: vscode.TextEditor,
  textEditorEdit: vscode.TextEditorEdit
) {
  let regexExp = new RegExp(regexString, "i");
  let regexExpG = new RegExp(regexString, "ig");
  const selections = textEditor.selections;
  if (
    (selections.length === 0 ||
      selections.reduce((acc, val) => acc || val.isEmpty),
    false)
  ) {
    return;
  }
  const config = vscode.workspace.getConfiguration("pxVwConverter");
  const changesMade = new Map();
  let sizeKeys: { [key: string]: number } = {};

  let currentSize: number = config.get("viewportWidth") ?? 1440;

  textEditor
    .edit((builder) => {
      let numOcurrences = 0;
      selections.forEach((selection) => {
        for (
          var index = selection.start.line;
          index <= selection.end.line;
          index++
        ) {
          let start = 0,
            end = textEditor.document.lineAt(index).range.end.character;
          if (index === selection.start.line) {
            let tmpSelection = selection.with({ end: selection.start });
            let range = findValueRangeToConvert(
              tmpSelection,
              regexString,
              textEditor
            );
            if (range) {
              start = range.start.character;
            } else {
              start = selection.start.character;
            }
          }
          if (index === selection.end.line) {
            let tmpSelection = selection.with({ start: selection.end });
            let range = findValueRangeToConvert(
              tmpSelection,
              regexString,
              textEditor
            );
            if (range) {
              end = range.end.character;
            } else {
              end = selection.end.character;
            }
          }
          let text = textEditor.document.lineAt(index).text.slice(start, end);

          sizeKeys = config.get("breakpoints") ?? {};

          //search the current text for any size keys
          for (const key in sizeKeys) {
            if (text.includes(key)) {
              currentSize = sizeKeys[key];
            }
          }

          const matches = text.match(regexExpG);
          numOcurrences += matches ? matches.length : 0;
          if (numOcurrences === 0) {
            continue;
          }
          const regex = regexExpG;

          const newText = text.replace(regex, (a, b, c) => {
            return replaceFunction(a, b, c, currentSize);
          });
          const selectionTmp = new vscode.Selection(index, start, index, end);
          const key = `${index}-${start}-${end}`;
          if (!changesMade.has(key)) {
            changesMade.set(key, true);
            builder.replace(selectionTmp, newText);
          }
        }
        return;
      });
      if (numOcurrences === 0) {
        vscode.window.showWarningMessage("There were no values to transform");
      }
    })
    .then((success) => {
      textEditor.selections.forEach((selection, index, newSelections) => {
        if (selections[index].start.isEqual(selections[index].end)) {
          const newPosition = selection.end;
          const newSelection = new vscode.Selection(newPosition, newPosition);
          // textEditor.selections[index] = newSelection;
        }
      });
      textEditor.selections = textEditor.selections;
      if (!success) {
        console.log(`Error: ${success}`);
      }
    });
}

function findValueRangeToConvert(
  selection: vscode.Range,
  regexString: string,
  textEditor: vscode.TextEditor
) {
  const line = selection.start.line;
  const startChar = selection.start.character;
  const text = textEditor.document.lineAt(line).text;
  const regexExpG = new RegExp(regexString, "ig");

  var result,
    indices = [];
  while ((result = regexExpG.exec(text))) {
    const resultStart = result.index;
    const resultEnd = result.index + result[0].length;
    if (startChar >= resultStart && startChar <= resultEnd) {
      return new vscode.Range(line, resultStart, line, resultEnd);
    }
  }
  return null;
}

export function deactivate() {}
