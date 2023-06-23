// (c) 2023, Raskitoma.io
// atk action file
// -------------------------------------------------------------------

function tbl_launch(tbl_object, tbl_route){
    $(`#${tbl_object}`).DataTable({
        ajax : `getusers?kind=${tbl_route}`,
        columns: [
            { data: 'username' },
            { data: 'name' },
            { data: 'email' },
            { data: 'last_login' },
            { data: 'uid' },
        ],
        columnDefs: [
            { targets: [4], 
                render: function(data, type, row) {
                    let render_html = null;
                    switch(tbl_route) {
                        case('pending'):
                            render_html = `<button class="btn btn-small btn-success" atk-action="approve" atk-name="${row['name']}" atk-pk="${row['pk']}" onclick="atk_action(this);">Approve</button>&nbsp;<button class="btn btn-small btn-danger atk_action" atk-action="block" atk-name="${row['name']}" atk-pk="${row['pk']}" onclick="atk_action(this);">Block</button>`;
                            break;
                        case('approved'):
                            render_html = `<button class="btn btn-small btn-danger" atk-action="disable" atk-name="${row['name']}" atk-pk="${row['pk']}" onclick="atk_action(this);">Disable</button>`;
                            break;
                        case('blocked'):
                            render_html = `<button class="btn btn-small btn-success" atk-action="enable" atk-name="${row['name']}" atk-pk="${row['pk']}" onclick="atk_action(this);">Enable</button>`;
                            break;
                    }
                    return render_html;
                }
            }
        ],
    });
}

function tab_action() {
    let tabs = document.querySelectorAll('button[role="tab"]');
    tabs.forEach(function(tab) {
        tab.onclick = function() {
            let tab_id = this.getAttribute('id');
            let main_obj_name = tab_id.split('-')[0];
            // reload table
            $(`#${main_obj_name}_tbl`).DataTable().ajax.reload();
        };
    });
}

function atk_action(obj) {
    let atk_action = obj.getAttribute('atk-action');
    let atk_pk = obj.getAttribute('atk-pk');
    let atk_name = obj.getAttribute('atk-name');
    // call api to perform action as post the api should be called by the same url as the page
    let url = `${window.location.origin}/atkaction`;
    let data = {
        'action': atk_action,
        'pk': atk_pk,
        'name': atk_name,
    }
    axios.post(url, data)
    .then(function (response) {
        toaster(response.data.message, 'info');
        // reload table
        let main_obj_name = obj.closest('table').getAttribute('id').split('_')[0];
        $(`#${main_obj_name}_tbl`).DataTable().ajax.reload();
    })
    .catch(function (error) {
        toaster(error, 'danger');
    });

}

document.addEventListener("DOMContentLoaded", function() {
    tbl_launch('pending_tbl', 'pending');
    tbl_launch('approved_tbl', 'approved');
    tbl_launch('blocked_tbl', 'blocked');
    tab_action();
});
