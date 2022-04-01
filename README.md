# pxvwconverter README

Converts values between vw and px while automatically adjusting for breakpoints

## how is this different from other px-vw converters?

This extension searches for keywords in your selection and updates the viewport width for the calculation according. By default, the extension searches for the keywords mobile, tablet, and desktop. These can be changed in the extension settings.

### example

If you were to highlight the following snippet:

```
  top: 100px; //this line would use the default value
  ${media.desktop} {
    top: 100px; //this line would use the value for the "desktop" breakpoint
  }
  ${media.tablet} {
    top: 100px; //this line would use the value for the "tablet" breakpoint
  }
  ${media.mobile} {
    top: 100px; //this line would use the value for the "mobile" breakpoint
  }
```

all the breakpoints can be configured in the extension settings

## Usage

1.  Highlight a section of text containing values to convert
2.  Press alt+z

## Configuration

`viewportWidth`
default viewport width

`breakpoints`
when scanning and converting your selection line-by-line, the extension will search for these breakpoint keywords. if found, the viewport width will be set to the breakpoint value for the remainder or the selection or until another breakpoint keyword is found.

`unitPrecisionVw`
Unit precision for viewport values

`unitPrecisionPx`
Unit precision for pixel values
