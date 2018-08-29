import { Component, Prop, State, Watch } from "@stencil/core";

import { PokeService, Gts, PokeCheck } from '../../utils/interfaces';


@Component({
  tag: "poke-uptime-service",
  styleUrl: "poke-uptime-service.scss"
})
export class PokeUptimeService {

    @Prop() warpEndpoint: string;
    @Prop() service: PokeService;
    @Prop() warp10Token: string;
    @Prop() debug: boolean;

    @State() warpscript: string;

    @State() options: RequestInit;

    @State() checks: Array<PokeCheck> = [];

    @State() instance: string;


    @Watch('service')
    getChecks() {
      if (! this.service.checks) {
        return;
      }
      this.checks = [ ...this.service.checks ];
      if (this.debug) {
        console.log(`[poke-uptime-service] getChecks`, this.checks);
      }

      this.getWarpscript();
      this.queryServer();
    }

    @Watch('warp10Token')
    getWarpscript() {
      if (this.debug) {
        console.log('[poke-uptime-service] getWarpscript', this.warpscript);
      }
      this.warpscript = `
        [
          '${this.warp10Token}'
          'http.response.time' { 'service_id'  '${this.service.service_id}' }
          NOW 6 h
          FETCH
          bucketizer.mean
          NOW
          0
          150
        ] BUCKETIZE

        [
          '${this.warp10Token}'
          'http.response.status' { 'service_id'  '${this.service.service_id}' }
          NOW 6 h
          FETCH
          bucketizer.last
          NOW
          0
          1
        ] BUCKETIZE

      `;
    }

    @Watch('warpscript')
    prepareQuery() {
      if (this.debug) {
        console.log('[poke-uptime-service] prepareQuery', this.warpscript);
      }
      this.options = {
        headers: {},
        mode: 'cors',
        redirect: 'follow',
        method: 'POST',
        body: this.warpscript,
      };
    }

    queryServer() {
      if (this.warpscript) {
        fetch(`${this.warpEndpoint}/exec`, this.options).then( response => {
          if (!response.ok) {
            throw new Error(`Response: ${response.status} - ${response.statusText}`);
          }
          return response.json();
        }).then( (data) => {
          if (this.debug) {
            console.log('[poke-uptime-service] queryServer - Got Warp 10 response', data);
          }
          this.gotResponse(data);
        }).catch( (error) => {
          console.error('[poke-uptime-service] queryServer - There has been a problem with your fetch operation:',
              error.message);
        });
      }
      window.setTimeout(() => this.queryServer(), 60000);
    }

    componentDidLoad() {
      this.instance = Math.random().toString(36).substring(7);
      this.getChecks();
    }


    gotResponse(stack: Array<Array<Gts>>) {
      if (stack.length != 2) {
        throw(`Warp 10 response doens't fit expected format`);
      }
      let httpResponseStatus = stack[0];
      let httpResponseTime = stack[1];

      httpResponseStatus.map( (item) => {
        this.checks.forEach( (check, index) => {
          if (this.debug) {
            console.log(`[poke-uptime-service] httpResponseStatus ${check.check_id}`);
          }
          if (check.check_id == item.l.check_id) {
            let zone = item.l.zone || '';
            if (!this.checks[index].zones) {
              this.checks[index].zones = {};
            } 
            if (!this.checks[index].zones[zone]) {
              this.checks[index].zones[zone] = {};
            }
            this.checks[index].zones[zone].status  = item.v[0][item.v[0].length-1];
            if (this.debug) {
              console.log(`[poke-uptime-service] httpResponseStatus ${item.v[0][item.v[0].length-1]} for service ${check.service_id}, zone ${zone} and check ${check.check_id}`, this.checks[index]);
            }
          }
        });
      });

      httpResponseTime.map( (item) => {
        this.checks.forEach( (check, index) => {
          if (this.debug) {
            console.log(`[poke-uptime-service] httpResponseTime ${check.check_id}`);
          }
          if (check.check_id == item.l.check_id) {
            let zone = item.l.zone || '';
            if (!this.checks[index].zones) {
              this.checks[index].zones = {};
            }
            if (!this.checks[index].zones[zone]) {
              this.checks[index].zones[zone] = {};
            }
            this.checks[index].zones[zone].gts = item;
          }
        });
      });
      this.checks = [ ...this.checks ];
    }

    render() {
      console.log('[poke-uptime-service] render called', this.checks);
      return(
        <div class="poke-service">
          <h5 class="poke-service-domain">{this.service.domain}</h5>
          <div class="poke-checks">
            {
              this.checks.map( (check) =>
                <poke-uptime-check-firefox
                    domain={this.service.domain}
                    zones={check.zones}
                    check={check}
                    warp10-token={this.warp10Token}></poke-uptime-check-firefox>
              )
            }
          </div>
        </div>
      );
    }
}
