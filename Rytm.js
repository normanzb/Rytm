/**
 * @class: Steps
 * An async step helper.
 * 
 * Well organize your code when calling nested async operation.
 * 
 * sample:
 * 
 * // original code:
 * function step3(){
 * 		console.log('all done');
 * }
 * function step2(){
 * 		asyncCall2(step3);
 * }
 * function step1(){
 * 		asyncCall1(step2);
 * }
 * 
 * // optimized code
 * var s = new Steps();
 * s.step(function step1(){
 * 		asyncCall1(this.go);
 * })
 * .step(function step2(){
 * 		asyncCall2(this.go);
 * })
 * .step(function step3(){
 * 		this.go();
 * })
 * .go();
 * 
 * 
 **/
;(function(factory){
    var Rytm = factory(this);

    if (this.require){

        if (this.require.amd && this.define){
            // if it is amd 
            this.define(Rytm);
        }
        else if (this.exports){
            // nodejs require
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
	p.next = function(){
		
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
		return this.next.apply(this, arguments);
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

    // TODO: 
    // p.reverse
	
	return Rytm;
});
