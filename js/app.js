var ENTER_KEY = 13;
var ESCAPE_KEY = 27;

var App = {	
	initialize: function() {
		this.todos = util.store('todoList');
		handlers.bindEvents();
		view.display();
	},	

	saveTodos: function() {
		util.store('todoList', this.todos);
	},

	createTodo: function(e) {
		this.todos.push({
			title: addTodoTextInput.value,
			completed: false,
			id: util.uuid(),
			subarray: []
		});
		addTodoTextInput.value = '';
		this.saveTodos();
		view.display();
	},

	indexFromEl: function(el) {
		var id = el.closest('li').id;
		var parentId = el.closest('ul').parentElement.id;
		// nested todos: target respective parent object
		if (parentId !== 'container') {
			var parentObj = this.retrieveObj(this.todos, parentId);
			var i = parentObj.subarray.length;
			while (i--) {
				if (parentObj.subarray[i].id === id) {
					return i;
				}
			}
		} else {
			var i = this.todos.length;
			while (i--) {
				if (this.todos[i].id === id) {
					return i;
				}
			}
		}
	},

	deleteTodo: function(e) {
		var nearestUl = e.target.closest('ul');
		var parent = nearestUl.parentElement;
		var todos;
		// nested todos: target respective parent object's subarray
		if (parent.tagName === 'LI') {
			var parentObj = this.retrieveObj(this.todos, parent.id);
			todos = parentObj.subarray;
		} else {
			todos = this.todos;
		}
		todos.splice(this.indexFromEl(e.target), 1);
		this.saveTodos();
		view.display();
	},

	toggleCompleted: function(e) {		 
		var i = this.indexFromEl(e.target);
		var nearestUl = e.target.closest('ul');
		var parent = nearestUl.parentElement;
		// nested todos: target respective parent object's subarray
		if (parent.tagName === 'LI') {
			var parentObj = this.retrieveObj(this.todos, parent.id);
			parentObj.subarray[i].completed = !parentObj.subarray[i].completed;
			this.toggleChildren(parentObj.subarray[i].subarray, parentObj.subarray[i]);
		} else {
			this.todos[i].completed = !this.todos[i].completed;
			this.toggleChildren(this.todos[i].subarray, this.todos[i]);
		}
		this.saveTodos();
		view.display();
	},

	toggleChildren: function(array, parent) {
		var isChecked = parent.completed;
		array.forEach(function(element) {
			element.completed = isChecked;
			if (element.subarray.length > 0) {
				return this.toggleChildren(element.subarray, parent);
			} 
		}, this);
		return array;
	},

	setUpEdit: function(e) {
  		var targetLi = e.target.closest('li');
  		targetLi.classList.add('editing');
  		var input = targetLi.querySelector('.edit');
  		input.focus();
	},

	editKeyup: function(e) {
		if (e.which === ENTER_KEY) {
			e.target.blur();
		}
		if (e.which === ESCAPE_KEY) {
			e.target.setAttribute('abort', true);
			e.target.blur();
		}
	},

	updateTodo: function(e) {
		var input = e.target;
		var val = input.value.trim();
		var nearestUl = input.closest('ul');
		var parent = nearestUl.parentElement;

		if (!val) {
			this.deleteTodo(e);
			return;
		}
		if (input.getAttribute('abort')) {
			input.setAttribute('abort', false);
		} else {  // nested todos: target respective parent object's subarray
			if (parent.tagName === 'LI') {
				var parentObj = this.retrieveObj(this.todos, parent.id);
				parentObj.subarray[this.indexFromEl(input)].title = val;
			} else {
				this.todos[this.indexFromEl(input)].title = val;
			}
		}
		this.saveTodos();
		view.display();
	},

	retrieveObj: function(array, id) {
	    for (var i = 0; i < array.length; i++) {
	        if (array[i].id === id) {
	        	return array[i];
	        } 
	        if (array[i].subarray.length > 0) {
	        	var result = this.retrieveObj(array[i].subarray, id);
	        	if (typeof result === 'object') {
	        		return result;
	        	}
	        }
	    }
	},

	pushNestedTodo: function(e) {
		var nearestUl = e.target.closest('ul');
		var parentLi = nearestUl.parentElement;
		var parentObj = this.retrieveObj(this.todos, parentLi.id);
		var input = parentLi.querySelector('.nesting').value.trim();
		if (input === '') {
			nearestUl.remove();
			return;
		}
		parentObj.subarray.push({
			title: input,
			completed: false,
			id: util.uuid(),
			subarray: []
		});
		this.saveTodos();
		view.display();
	},

	toggleAll: function() {
		var allTodoLis = Array.from(document.querySelectorAll('li')); 
		var todosCompleted = allTodoLis.every(function(li) {
			return li.firstElementChild.children[0].checked;
		});
		function toggleAllComplete(array) {
			array.forEach(function(element) {
				element.completed = true;
				if (element.subarray.length > 0) {
					return toggleAllComplete(element.subarray);
				} 
			});
			return array;
		}
		function toggleAllUndone(array) {
			array.forEach(function(element) {
				element.completed = false;
				if (element.subarray.length > 0) {
					return toggleAllUndone(element.subarray);
				} 
			});
			return array;
		}		
		if (todosCompleted) {
			toggleAllUndone(this.todos);
		} else {
			toggleAllComplete(this.todos);
		}
		this.saveTodos();
		view.display();
	},

	// loop through this.todos to search for all completed items
		// recursive case: subarray todos
		// base case: todo completed, delete by index
	deleteCompleted: function() {
		function deleteItems(array) {
			for (var i = array.length-1; i >= 0; i--) {
				if (!array[i].completed) {
					if (array[i].subarray.length > 0) {
						deleteItems(array[i].subarray);
					} 
				} else {
					array.splice(i, 1);
				}
			}
		}
		deleteItems(this.todos);
		this.saveTodos();
		view.display();
	}
};

var view = {
	display: function() {
		var containerDiv = document.getElementById('container');
		containerDiv.innerHTML = '';
		this.generateDisplay();
		addTodoTextInput.focus();
	},

	generateDisplay: function(array) { 
		var containerDiv = document.getElementById('container');
		var newUl = document.createElement('ul');
		if (!array) {
			array = App.todos;
		} 
		if (containerDiv.childNodes.length === 0) {
			containerDiv.appendChild(newUl);
		}
		array.forEach(function(todo) {
			var todoLi = document.createElement('li');
			var divToView = document.createElement('div');
			var checkbox = document.createElement('input');
			var todoLabel = document.createElement('label');
			var nestedTodoButton = document.createElement('button');
			var deleteButton = document.createElement('button');
			var divToEdit = document.createElement('input');

			newUl.appendChild(todoLi);
			todoLi.id = todo.id;

			divToView.className = 'view';
			divToView.style.display = 'block';
			todoLi.appendChild(divToView);

			checkbox.className = 'toggle';
			checkbox.checked = false;
			checkbox.type = 'checkbox';
			divToView.appendChild(checkbox);

			todoLabel.innerText = todo.title;
			divToView.appendChild(todoLabel);

			deleteButton.textContent = String.fromCharCode(215);
			deleteButton.className = 'deleteButton'; 
			divToView.appendChild(deleteButton);

			nestedTodoButton.textContent = String.fromCharCode(43);
			nestedTodoButton.className = 'nested-todo';
			divToView.appendChild(nestedTodoButton);

			divToEdit.className = 'edit';
			divToEdit.value = todo.title;
			divToEdit.style.display = 'none';
			todoLi.appendChild(divToEdit);

			if (todo.completed === true) {
				checkbox.checked = true;
				todoLabel.style.setProperty('text-decoration', 'line-through');
				todoLabel.style.setProperty('color', '#808080');
			}
			if (todo.subarray.length > 0) {
				todoLi.appendChild(this.generateDisplay(todo.subarray));
			} 
		}, this);
		return newUl;
	},

	openNesting: function(e) {
		var parentLi = e.target.closest('li');	
		var nestedUl = document.createElement('ul');
		var nestedLi = document.createElement('li');
		var textInput = document.createElement('input');
		parentLi.appendChild(nestedUl);
		nestedUl.appendChild(nestedLi);
		nestedLi.appendChild(textInput);
		textInput.classList.add('nesting');
		textInput.focus();
	},

	editing: function(e) {
		var closestLi = e.target.closest('li');
		var editBox = closestLi.querySelector('.edit');
		var viewBox = closestLi.querySelector('.view');
		if (closestLi.className === 'editing') {
			editBox.style.display = 'block';
			viewBox.style.display = 'none';
		} 
	}
};
// from todoMVC
var util = {
	uuid: function() {
		var i, random;
		var uuid = '';
		for (i = 0; i < 32; i++) {
			random = Math.random() * 16 | 0;
			if (i === 8 || i === 12 || i === 16 || i === 20) {
				uuid += '-';
			}
			uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
		}
		return uuid;
	},
	store: function(namespace, data) {
		if (arguments.length > 1) {
			return localStorage.setItem(namespace, JSON.stringify(data));
		} else {
			var store = localStorage.getItem(namespace);
			return (store && JSON.parse(store)) || [];
		}
	}
};

var handlers = {
	bindEvents: function() {
		var addTodoTextInput = document.getElementById('addTodoTextInput');
		var toggleAllButton = document.getElementById('toggle-all');
		var deleteCompButton = document.getElementById('delete-completed');
		var containerDiv = document.getElementById('container');

		addTodoTextInput.addEventListener('keyup', function(e) {
			if (addTodoTextInput.value.trim() === '') {
				return;
			}
			if (e.which === ENTER_KEY) {
				App.createTodo(e);
			} 
			if (e.which === ESCAPE_KEY) {
				addTodoTextInput.value = '';
			}
		});
		toggleAllButton.addEventListener('click', function() {
			App.toggleAll();
		});
		deleteCompButton.addEventListener('click', function() {
			App.deleteCompleted();
		});
		containerDiv.addEventListener('click', function(e) {
		    if (e.target.className === 'deleteButton') {
		        App.deleteTodo(e);
		    }
		    if (e.target.className === 'toggle') {
		        App.toggleCompleted(e);
		    }
		    if (e.target.tagName === 'LABEL') {
		        view.editing(e);
		        App.setUpEdit(e);
		    }
		    if (e.target.className === 'nested-todo') {
		        view.openNesting(e);
		    }
		});
		containerDiv.addEventListener('keyup', function(e) {
		    if (e.target.className === 'edit') {
		        App.editKeyup(e);
		    }
		    if (e.which === ENTER_KEY) {
		    	if (e.target.value.trim() === '') {
		    		e.target.remove();
		    	} else if (e.target.className === 'nesting') {
		    		App.pushNestedTodo(e);
		    	} else if (e.target.className === 'edit') {
		    		App.updateTodo(e);
		    	}
		    	addTodoTextInput.focus();
		    }
		    if (e.which === ESCAPE_KEY) {
				e.target.value = '';
			}
		});
		containerDiv.addEventListener('focusout', function(e) {
		    if (e.target.className === 'edit') {
		        App.updateTodo(e);
		    }
		    // if enter_key isn't pressed, delete nested input.
		    if (e.target.className === 'nesting') {
		    	e.target.parentElement.remove();
		    } 
		});
	}
};
App.initialize();


// REQUIREMENTS:

// CREATE TODOS
// 'It should create a new todo list item when text is entered into the header field.'
// 'It should save new todo data in local storage.'
// 'It should update the display after new todos are added.'
// 'It should load todo data from local storage upon page refresh.'
// 'If no todos were saved, it should return an empty list.'

// EDIT TODOS
// 'It should open an editable field for each todo with a click event.'
// 'It should save edits to todos in local storage if the enter key is pressed.'
// 'It should close the editable field / focus out of a todo element once edits are entered and saved.'
// 'It should update the display after todo edits are saved.'
// 'It should focus out of a todo element if edits were not saved.'
// 'It should focus out of a todo element if no edits were made.'
// 'If a todo item text is deleted during editing, it should delete the todo.'

// MARK COMPLETE
// 'It should mark todos complete by clicking their checkbox complete.'
// 'It should undo marking todos complete with the same checkbox.'
// 'It should update the display after the complete checkbox is clicked.'
// 'It should save completion status of each todo in local storage.'
// 'It should load completion status of each todo from local storage upon page refresh.'

// DELETE TODOS
// 'It should delete a todo when the delete button is clicked.'
// 'It should remove deleted todo data from local storage.'
// 'It should update the display after todos are deleted.'

// CREATE NESTED TODOS 
// 'It should create child/nested items from a parent item when the nested-todo button is clicked.'
// 'It should save nested todo data in local storage, as the this.todos array.'
// 'It should update the display after nested todos are added.'
// 'It should load nested todo data from local storage upon page refresh.'
// 'If no text is entered into a nested todo field, it should delete the nested element.'

// 'It should edit nested todos in the same way as non-nested todos.'
// 'It should toggle complete/incomplete for nested todos in the same way as non-nested todos.'
// 'If a todo has child/nested items, it should toggle complete/incomplete for the nested todos.'
// 'It should delete nested todos in the same way as non-nested todos.'
// 'If a todo has child/nested items and its delete button is clicked, it should delete the nested todos too.'

// TOGGLE ALL TODOS
// 'It should mark all todos complete if not all todos are complete by clicking a toggle-all button.'
// 'It should mark all todos incomplete if all todos are complete by clicking the same button.'

// DELETE ALL COMPLETED TODOS
// 'It should delete all todos marked complete if the clear-completed button is clicked.'