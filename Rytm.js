
// #Rytm

// Rytm is a asynchronous flow control library that turns nested chaos into linear, readable
// sweetness.

// ## Why Rytm

// Says we are going to:

// 1. Wait for user input.
// 2. Send user input to server, and wait for response.
// 3. Slide down the message box and in the meantime, fade in an image.
// 4. After above animation done, fade in the message which retrieved in step #2.

// To get above jobs done, inexperienced JavaScript developer usually generate code like
// this:
//
//     // hook on the input event and waiting for 'enter'
//     txtUserInput.bind('input', function(evt){
//         if (evt.keyCode == 13){
//
//             // post the user input to server and wait for response.
//             $.post('/api', txtUserInput.val(), function(data){
//
//                 var msg = data.message, animationCount = 0;
//
//                 divMsgBox.slideDown(function(){
//                     animationCount++
//                     checkIfAnimationDone();
//                 })
//
//                 imgBanner.fadeIn(function(){
//                     animationCount++
//                     checkIfAnimationDone();
//                 })
//
//                 function checkIfAnimationDone(){
//                     if (animationCount >= 2){
//                         divMsgInner.html(msg).fadeIn();
//                     }
//                 }
//             }
//             });
//         }
//     });

// This is a really common task in asynchronous programming world but the code result doesn't 
// look good enough:

// 1. Too many nested blocks reduced your code readibility.
// 2. Hard to understand the logic, you need to trace the block by block to see what happened 
// eventually.
// 3. Error prone.
// 4. The last fade-in animation must be done after the first 2 animation, writing code to check 
// task status is tedious and waste of your time.

// By using a flow control library such as Rytm, writing code snippet for above task can be much
// safer, simpler, and productivity, and the code become more readable and compact:

//     var r = new Rytm(function(){
//
//         txtUserInput.bind('input', this.next())
//
//     }, function(evt){
//
//        if (evt.keyCode == 13){
//            this.go();
//        }
//
//     }, function(){
//
//        $.postMessage('/api', txtUserInput.val(), this.go);
//
//     }, function(data){
//
//        // pass the data to next beat
//        this.nextArgs(data);
//        // or :
//        // this.next(this.next.bind(this, data));
//
//        divMsgBox.slideDown(this.all());
//        imgBanner.fadeIn(this.all());
//
//      }, function(data){
//
//         divMsgInner.html(data.msg).fadeIn();
//
//      });
//

// ## Multiple environment support
// Rytm supports multiply JavaScript environment including:

;(function(factory){
    var Rytm = factory(this);

    if (this.require){

        if (this.require.amd && this.define){
            // * AMD loader such as requirejs or curl: 
            // `require('path/to/rytm', callback);`
            this.define(Rytm);
        }
        else if (this.exports){
            // * Nodejs module loading:
            //   `var rytm = require('path/to/rytm');`
            this.exports = Rytm;
        }
    }

})
(function(global, undef){
    "use strict";

    // no operation func
    var noop;

    if (global.etui){
        noop = global.etui.noop;
    }
    else if(global.jQuery){
        noop = global.jQuery.noop;
    }
    else{
        noop = function(){};
    }

    /*
        @private loads steps from arguments
    */
    function loadSteps(args){

        for(var i = 0, l < args.length; i < l; i++){
            var cur = args[i];

            if (typeof cur != "function"){
                continue;
            }

            this.step(cur);
        }
    }

    /* Constructor */
	var Rytm = function(){
	
		this.steps = [this._createNode(function(){
			this.next();
		})];
		this.cursor = this.steps[0];
		
		// wrap go(), make sure the context of go() is always current
		// instance
		this.go = this.go.bind(this);
		this.defer = this.defer.bind(this);
		this.wait = this.wait.bind(this);

        // load steps which passed in ctor
        loadSteps(arguments)
        
	};
	var p = Rytm.prototype;
	p._createNode = function(callback, next){
		if (next === undef){
			next = null;
		}
		var ret = {callback: callback, next: next};
		return ret;
	};

	/**
	 * @function step
	 * define a step
	 **/
	p.beat = function(callback){
        if (arguments.length > 1){
            loadSteps(arguments);
        }
        else{
    		var stepStruct = this._createNode(callback);
    		this.steps[this.steps.length - 1].next = stepStruct;
    		this.steps.push(stepStruct);
    		
    		// if already called go(), this.cursor will pointed to null
    		// repoint it so this.next() can continue calls the newly added
    		// steps
    		if (this.cursor == null){
    			this.cursor = stepStruct;
    		}
        }
		
		return this;
	};

    // backward compatibility
    p.step = beat;

	/**
	 * @function wait
	 * add a step into current steps instance, the newly added step will pause execution 
	 * for specified milliseconds
	 */
	p.wait = function(timeout){
		var s = this;

		s.step(function(){
			setTimeout(s.go, timeout);
		});
		
		return this;
	};

	/**
	 * @function go
	 * Start next step immediately
	 **/
	p._go = function(){
		
		var callback;
		
		if (this.cursor == null){
			return this;
		}
		
		callback = this.cursor.callback;

		// reset lastCalls array
		this.cursor.lastCalls = [];
		
		if (callback == null){
			return this;
		}
		
		// advance to next
		this.cursor = this.cursor.next;

		var result = callback.apply(this, arguments);

        // go to next step direclty if there is return value
        if (result !== undefined){
            this.go(result);
        }
		
		return this;
	};
	/**
	 * @function go
	 * Start next step immediately 
	 * (this function will always be executed
	 * with context pointed to current instance of steps)
	 **/
	p.go = function(){
		return this._go.apply(this, arguments);
	};

	/**
	 * @function go
	 * Start next step when code execution thread idle
	 * (this function will always be executed
	 * with context pointed to current instance of steps)
	 **/
	p.defer = function(){
		setTimeout(this.go, 0);
		return this;
	};

	/**
	 * @function once
	 * Return a callback, once the callback is called, go to next step and ignore 
	 * the other calls which defined in current step
	 */
	p.once = function(){
		var cur = this.cursor,
			go = this.go,
			scope = this;

		return function(){
			if (cur != scope.cursor){
				return;
			}

			go();
		};
	};

	/**
     * @function all
     * Return a new callback each time last() is called, will go to next step once all generated callback is called
     * at least once.
     */
    p.all = function(){
        var cur = this.cursor,
            go = this.go;

        if (!cur){
        	// means we reached the end
        	return noop;
        }

        if (!cur.lastCalls){
            cur.lastCalls = [];
        }
        if (cur.ticked == null){
            cur.ticked = false;
            setTimeout(function(){
                cur.ticked = true;
            }, 0)
        }

        var ret = function(){
            var scope = this,
                args = arguments;
            
            if (!cur.ticked){
                // if it is executed within the calling TASK, we delay the actual execution
                // to next TASK
                // this is to prevent a usage pitfall:
                // s.step(function(){
                    // // this will cause problem
                    // executeTheCallbackImmediately(s.all());
                    // executeTheCallbackImmediately(s.all());
                //})
                setTimeout(function(){
                    return ret.apply(scope, args);
                }, 0);

                return null;
            }

            var l = cur.lastCalls.length;
            while(l--){
                if (cur.lastCalls[l] == ret){
                    cur.lastCalls.splice(l, 1);
                    if (cur.lastCalls.length <= 0){
                        go();
                    }
                    return true;
                }
            }

            return false;
        };

        cur.lastCalls.push(ret);
    
        return ret; 
    };


// ## TODO

// ### reverse
// ### bounce
// If we are at the end, reverse the sequence and go

// ### next
// Return next beat, next should be a getter/setter that allow

// ### prev 
// Return prev beat

// ### group

// ### data/params
// To hold the parameters to next beat
// ### test
	
	return Rytm;
});
