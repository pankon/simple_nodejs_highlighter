const {Transform} = require('stream');

class HtmlStream extends Transform {
    constructor()
    {
        super();
        this.lookup = {
            "\n": "<br />",
            "<" : "&lt",
            " " : "&nbsp"
        };
        this.highlight = {};
        this.sep_chars = {
            doUse: false
        };
        this.rules = {};
        this.general_rules = {};
    }

    add_sep_char(sep_char) {
        if (sep_char in this.sep_chars)
        {
            return;
        }

        if (sep_char in this.lookup) {
            this.sep_chars[this.lookup[sep_char]] = true;
        } else {
            this.sep_chars[sep_char] = true;
        }
       
        this.sep_chars.doUse = true;
    }

    get_span(style, tag) {
        return `<span style="${style}">${tag}</span>`;
    }

    add_highlight(tag, style) {
        this.highlight[tag] = this.get_span(style, tag);
    }

    add_rule(start_char, end_char, style) {
        this.add_sep_char(start_char);
        this.add_sep_char(end_char);

        let current_rule = null;
        if (start_char in this.rules)
        {
            current_rule = this.rules[start_char];
        } else {
            current_rule = {};
            this.rules[start_char] = current_rule;
        }

        current_rule[end_char] = style;
    }

    add_general_rule(sep_char, style) {
        this.add_sep_char(sep_char);

        this.general_rules[sep_char] = style;
    }

    _push_char(char, html)
    {
        if (char in this.lookup) {
            html.push(this.lookup[char]);
        } else {
            html.push(char);
        }
    }

    _general_rule_do(last_sep, char, found, html) {
        html.push(this.get_span(this.general_rules[last_sep], found));
        this._push_char(char, html);
    }

    _highlight_transform(chunk) {
        const html = [];
        let i = 0;

        let last_sep = "";
        let char = null;
        while (i < chunk.length)
        {
            last_sep = char;
            const buf = [];
            char = String.fromCharCode(chunk[i]);
            while ((char in this.sep_chars) === false 
                    && (char in this.lookup) === false
                    && i < chunk.length) {
                i++;
                buf.push(char);
                char = String.fromCharCode(chunk[i]);
            } 

            let found = buf.join("");

            if (last_sep in this.rules)
            {
                if (char in this.rules[last_sep])
                {
                    html.push(this.get_span(this.rules[last_sep][char], found));
                    this._push_char(char, html);
                    ++i;
                    continue;
                }
                else if (last_sep in this.general_rules)
                {
                    this._general_rule_do(last_sep, char, found, html);
                    ++i;
                    continue;
                }
            }
            else if (last_sep in this.general_rules)
            {
                this._general_rule_do(last_sep, char, found, html);
                ++i;
                continue;
            }

            if (found in this.highlight) {
                html.push(this.highlight[found]);
            }
            else {
                html.push(found);
            }

            this._push_char(char, html);
            
            ++i;
        }

        return html.join("");
    }

    _simple_transform(chunk) {
        const html = [];
        for (let i = 0; i < chunk.length; i++)
        {
            let char = String.fromCharCode(chunk[i]);

            this._push_char(char, html);
        }

        return html.join("");
    }

    _transform(chunk, encoding, callback) {
        let html = "";

        if (this.sep_chars.doUse) {
            html = this._highlight_transform(chunk);
        } else {
            html = this._simple_transform(chunk);
        }

        this.push(html);
        callback();
    }
}

exports.HtmlStream = HtmlStream;