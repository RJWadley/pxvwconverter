import { parse } from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // register custom shortcuts
  for (let i = 0; i < 3; i++) {
    const config = vscode.workspace.getConfiguration("pxVwConverter");
    let breakpoint: string | undefined = config.get("shortcut" + i);
    disposable = vscode.commands.registerTextEditorCommand(
      "extension.shortcut" + i,
      function (textEditor, textEditorEdit) {
        var regexStr = "([0-9]*\\.?[0-9]+)(px|vw)";
        placeholder(
          regexStr,
          (match, value, unit, viewportWidth) =>
            unit === "px"
              ? `${px2Vw(parseFloat(value), viewportWidth)}vw`
              : `${vw2Px(parseFloat(value), viewportWidth)}px`,
          textEditor,
          textEditorEdit,
          breakpoint
        );
      }
    );
    context.subscriptions.push(disposable);
  }

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
  const config = vscode.workspace.getConfiguration("pxVwConverter");
  var unitPrecision: number | undefined = config.get("unitPrecisionPx");
  const value = parseFloat(((vw / 100) * viewportWidth).toFixed(unitPrecision));
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
  textEditorEdit: vscode.TextEditorEdit,
  forceBreakpoint?: string
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
  let currentSize: number | undefined = config.get("alwaysUseBreakpoints")
    ? undefined
    : config.get("viewportWidth") ?? 1440;
  let color = "";
  //array containing colors for a dark material rainbow
  let colors: string[] = [
    //dark green
    "#388e3c",
    //dark blue
    "#1976d2",
    //dark purple
    "#7b1fa2",
    //dark yellow
    "#fdd835",
    //dark orange
    "#ff6f00",
    //dark teal
    "#00b0ff",
    //dark pink
    "#ad1457",
    //dark grey
    "#616161",
    //dark brown
    "#6d4c41",
    //dark indigo
    "#3f51b5",
    //dark cyan
    "#00b8d4",
    //dark lime
    "#cddc39",
  ];
  let colorMap: {
    [key: string]: string;
  } = {};

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

          //assign each size key to a color and store it in colorMap
          let colorIndex = 0;
          for (let key in sizeKeys) {
            colorMap[key] = colors[colorIndex];
            colorIndex++;
          }

          //search the current text for any size keys
          for (const key in sizeKeys) {
            if (text.includes(key)) {
              currentSize = sizeKeys[key];
              color = colorMap[key];
            }
          }

          if (!forceBreakpoint) {
            let currentLineNumber =
              textEditor.document.lineAt(index).lineNumber;
            while (currentSize === undefined) {
              if (currentLineNumber <= 0) {
                currentSize = config.get("viewportWidth") ?? 1440;
              }

              let lineText = textEditor.document.lineAt(currentLineNumber).text;
              for (const key in sizeKeys) {
                if (lineText.includes(key)) {
                  currentSize = sizeKeys[key];
                  color = colorMap[key];
                }
              }
              currentLineNumber--;
            }
          }

          if (forceBreakpoint && sizeKeys[forceBreakpoint]) {
            currentSize = sizeKeys[forceBreakpoint];
          }

          if (config.get("colorize") === true) {
            //highlight the current line
            let decorationType = vscode.window.createTextEditorDecorationType({
              backgroundColor: color,
            });

            textEditor.setDecorations(decorationType, [
              textEditor.document.lineAt(index),
            ]);

            //remove the decoration after a half second
            setTimeout(() => {
              textEditor.setDecorations(decorationType, []);
            }, 500);
          }

          const matches = text.match(regexExpG);
          numOcurrences += matches ? matches.length : 0;
          if (numOcurrences === 0) {
            continue;
          }
          const regex = regexExpG;

          const newText = text.replace(regex, (a, b, c) => {
            return replaceFunction(
              a,
              b,
              c,
              currentSize ?? config.get("viewportWidth") ?? 1440
            );
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
